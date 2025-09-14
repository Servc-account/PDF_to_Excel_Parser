/* eslint-disable react/no-unused-prop-types */
import './PdfJsReader.scss';
import 'pdfjs-dist/web/pdf_viewer.css';
import { DPR, MAX_ZOOM, MIN_ZOOM, PAGE_GAP, RENDER_SCALE, renderClickableLinkAnnotations, ZOOM_STEP } from './pdfReaderHelpers';
import { Button } from '../InteractiveUIControls/Button/Button';
import { Spinner } from '../Spinner';
import * as pdfjsLib from 'pdfjs-dist';
// eslint-disable-next-line import/extensions
import PDFJSWorkerUrl from 'pdfjs-dist/build/pdf.worker?url';
import { TextLayerBuilder } from 'pdfjs-dist/web/pdf_viewer.mjs';
import React, { forwardRef, type HTMLAttributes, useCallback, useEffect, useRef, useState} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { VariableSizeList as List } from 'react-window';

export const isMobile = () => window.innerWidth < 768;

export const isLandscape = () => window.innerWidth > window.innerHeight;

pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorkerUrl;

type PdfJsReaderProps = {
  url: string,
};

// Define Row outside of PdfJsReader to prevent re-creation on each render
type PageProps = {
  index: number,
  renderPage: (
    pageNum: number,
    canvasRef: React.RefObject<HTMLCanvasElement>,
    textLayerRef: React.RefObject<HTMLDivElement>,
    task: { cancel?: () => void, }
  ) => Promise<void>,
  style: React.CSSProperties,
};

type RenderTask = {
  cancel?: () => void,
};

const getZoomByPdf = async (
  pageWidth: number,
  containerWidth: number,
) => {
  try {
    // Get the first page to check orientation
    const availableWidth = containerWidth * 0.85;

    // Calculate zoom factor based on width
    let calculatedZoom = availableWidth / pageWidth;

    // Ensure zoom is within reasonable bounds
    calculatedZoom = Math.max(calculatedZoom, MIN_ZOOM);
    calculatedZoom = Math.min(calculatedZoom, MAX_ZOOM);

    if (!isMobile()) {
      // Round to nearest 0.25 for cleaner values
      const roundedZoom = Math.round(calculatedZoom * 4) / 4;
      // Take not more than 1.5
      calculatedZoom = Math.min(roundedZoom, 1.5);
    }

    return calculatedZoom;
  } catch {
    // Fallback to device-based defaults if page fetch fails
    if (isLandscape()) {
      return window.innerWidth < 1_280 ? 1.5 : 1;
    }

    return 0.725;
  }
};

const Page: React.FC<PageProps> = ({index, renderPage, style}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask>({});

  useEffect(() => {
    // Cancel any previous render task
    renderTaskRef.current.cancel?.();

    // Create a new render task
    const task: RenderTask = {};
    renderTaskRef.current = task;

    renderPage(index + 1, canvasRef, textLayerRef, task);

    // Cleanup on component unmount or when index changes
    return () => task.cancel?.();
  }, [index, renderPage]);

  return (
    <div
      className='relative flex items-center justify-center overflow-hidden bg-grey-100'
      style={{
        ...style,
        paddingBottom: PAGE_GAP / 2,
        paddingTop: PAGE_GAP / 2,
      }}
    >
      <canvas className='bg-white' ref={canvasRef} />
      <div className='textLayer absolute' ref={textLayerRef} />
    </div>
  );
};

// Helper functions to set up the textLayer inside renderPage function
const clearTextLayer = (textLayerDiv: HTMLDivElement) => {
  while (textLayerDiv.firstChild) {
    textLayerDiv.removeChild(textLayerDiv.firstChild);
  }
};

const configureTextLayer = (
  textLayerDiv: HTMLDivElement,
  canvas: HTMLCanvasElement,
  viewport: pdfjsLib.PageViewport,
  zoomFactor: number,
) => {
  const scaledFactor = zoomFactor / RENDER_SCALE;

  // Configure text layer with scaled viewport dimensions
  textLayerDiv.style.width = `${viewport.width * scaledFactor}px`;
  textLayerDiv.style.height = `${viewport.height * scaledFactor}px`;

  // Position based on canvas offset
  textLayerDiv.style.left = `${canvas.offsetLeft}px`;
  textLayerDiv.style.top = `${canvas.offsetTop}px`;

  // PDF.js uses --scale-factor CSS variable internally to calculate text positioning and sizing.
  // This ensures text elements are properly scaled to match the PDF's internal dimensions.
  // We tried to pass it to "TextLayerBuilder" as an option but we couldn't find a proper way as it's either it's poorly documented or we just missed.
  // As a solution we need to change the global css variable that this lib uses (--scale-factor).
  // For now we just override it here via textLayerDiv element
  textLayerDiv.style.setProperty('--scale-factor', zoomFactor.toString());
};

// Define a custom outer element for the List component
const Outer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) =>
    <div
      ref={ref}
      {...props}
      className='overflow-auto will-change-transform'
    />,
);

const Inner = (contentWidth: number, parentWidth: number) => {
  const SCROLLBAR_WIDTH_PX = 12;
  const isZoomed = parentWidth < contentWidth;
  const translateX = `translateX(${SCROLLBAR_WIDTH_PX}px)`;
  return forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    (props, ref) =>
      <div
        ref={ref}
        {...props}
        style={{ ...props.style, transform: isZoomed ? translateX : '', width: contentWidth }}
      />
    ,
  );
};

export const PdfJsReader: React.FC<PdfJsReaderProps> = ({ url }) => {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const listRef = useRef<List>(null);
  const [errorState, setErrorState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [zoomFactor, setZoomFactor] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [maxPageWidth, setMaxPageWidth] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Current loading operation ID, used to detect and destroy stale (previous, not relevant) operations
  const loadIdRef = useRef(0);

  const updateMaxPageWidth = async (
    doc: pdfjsLib.PDFDocumentProxy,
    loadId: number,
  ) => {
    let maxWidth = 0;
    const heights: number[] = [];

    for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex++) {
      const page = await doc.getPage(pageIndex);
      // Stale operation, exit
      if (loadId !== loadIdRef.current) {
        return;
      }

      const viewport = page.getViewport({ scale: 1 });
      if (viewport.width > maxWidth) {
        maxWidth = viewport.width;
      }

      // Store the height with the PAGE_GAP included
      const height = viewport.height * RENDER_SCALE + PAGE_GAP;
      heights.push(height);
    }

    // Final check before state update
    if (loadId !== loadIdRef.current) {
      return;
    }

    setPageHeights(heights);
    setMaxPageWidth(maxWidth);
  };

  // Function to get page height
  const getPageHeight = useCallback((index: number) => {
    if (pageHeights[index]) {
      return pageHeights[index] * (zoomFactor / RENDER_SCALE);
    }

    // Fallback height
    return 750;
  }, [pageHeights, zoomFactor]);

  useEffect(() => {
    // Reset list measurements when zoom changes
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [zoomFactor]);

  // Load the PDF document and pre-load all page dimensions to find maximum width and store heights
  useEffect(() => {
    const thisLoadId = ++loadIdRef.current;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setPageHeights([]);
        setMaxPageWidth(0);
        setPdf(null);

        loadingTask = pdfjsLib.getDocument({ url, withCredentials: true });
        const loadedPdf = await loadingTask.promise;

        // Check if operation is stale
        if (thisLoadId !== loadIdRef.current || cancelled) {
          loadedPdf?.destroy?.();
          return;
        }

        setPdf(loadedPdf);
        await updateMaxPageWidth(loadedPdf, thisLoadId);
      } catch {
        if (!cancelled && thisLoadId === loadIdRef.current) {
          setErrorState(true);
        }
      } finally {
        if (!cancelled && thisLoadId === loadIdRef.current) {
          setErrorState(false);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [url]);

  // Set the canvas dimensions based on the viewport (page size)
  const setCanvasDimensions = useCallback((
    canvas: HTMLCanvasElement,
    viewport: pdfjsLib.PageViewport,
  ) => {
    const scaledFactor = zoomFactor / RENDER_SCALE;

    canvas.width = viewport.width * DPR;
    canvas.height = viewport.height * DPR;
    canvas.style.width = `${viewport.width * scaledFactor}px`;
    canvas.style.height = `${viewport.height * scaledFactor}px`;
  }, [zoomFactor]);

  const renderPage = useCallback(
    async (
      pageNum: number,
      canvasRef: React.RefObject<HTMLCanvasElement>,
      textLayerRef: React.RefObject<HTMLDivElement>,
      task: { cancel?: () => void, } = {},
    ) => {
      if (!pdf || !canvasRef.current || !textLayerRef.current) {
        return;
      }

      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;

        if (!canvas) {
          return;
        }

        setCanvasDimensions(canvas, viewport);
        const context = canvas.getContext('2d');

        if (!context) {
          return;
        }

        // Clear canvas with white background first
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Use setTransform instead of scale for better control
        context.setTransform(DPR, 0, 0, DPR, 0, 0);

        // Store the render operation to allow cancellation
        const renderTask = page.render({ canvasContext: context, viewport });
        task.cancel = () => renderTask.cancel();

        await renderTask.promise;

        // If task was cancelled, don't proceed with text layer
        if (!task.cancel) {
          return;
        }

        clearTextLayer(textLayerDiv);

        // Apply the text layer after canvas is fully rendered
        setTimeout(() => {
          // Recheck if canvas exists and task wasn't cancelled
          if (canvas && task.cancel) {
            configureTextLayer(textLayerDiv, canvas, viewport, zoomFactor);
          }
        }, 0);

        const textContent = await page.getTextContent();

        // Check if task was cancelled before continuing
        if (!task.cancel) {
          return;
        }

        const textLayerBuilder = new TextLayerBuilder({
          pdfPage: page,
        });

        await textLayerBuilder.render(viewport, { textContent });

        // Final check before appending to DOM
        if (task.cancel === undefined) {
          return;
        }

        textLayerDiv.appendChild(textLayerBuilder.div);

        // Reapply text layer position after append to ensure alignment
        setTimeout(() => {
          if (canvas && task.cancel) {
            // Ensure text layer is aligned with canvas
            textLayerDiv.style.left = `${canvas.offsetLeft}px`;
            textLayerDiv.style.top = `${canvas.offsetTop}px`;
          }
        }, 0);

        await renderClickableLinkAnnotations(page, viewport, textLayerDiv, zoomFactor);
      } catch {
        // Ignore cancelled render errors
      }
    },
    [
      pdf,
      setCanvasDimensions,
      zoomFactor,
    ],
  );

  // -------- ZOOM AND RESIZE HANDLERS -------- //

  const centerWhenZoomed = () => {
    if (!scrollContainerRef.current || !pageHeights.length) {
      return;
    }

    const container = scrollContainerRef.current;
    container.scrollLeft = (maxPageWidth * zoomFactor - container.clientWidth) / 2;
  };

  useEffect(centerWhenZoomed, [pageHeights, zoomFactor]);

  const updateZoom = async () => {
    if (pdf && containerRef.current) {
      const newZoom = await getZoomByPdf(maxPageWidth, containerRef.current.clientWidth);
      setZoomFactor(newZoom);
    }
  };

  useEffect(() => {
    updateZoom();
  }, [maxPageWidth]);

  // Add orientation change listener for mobile devices
  useEffect(() => {
    window.addEventListener('orientationchange', updateZoom);

    return () => {
      window.removeEventListener('orientationchange', updateZoom);
    };
  });

  const handleZoomIn = useCallback(() => {
    setZoomFactor((prevZoom) => Math.min(prevZoom + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomFactor((prevZoom) => Math.max(prevZoom - ZOOM_STEP, MIN_ZOOM));
  }, []);

  // ------------ FULLSCREEN HANDLERS ------------ //

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen({navigationUI: 'show'});
      setIsFullscreen(true);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (errorState) {
    return (
      <div className='flex size-full items-center justify-center text-title-1'>
        Unable to load PDF
      </div>
    );
  }

  return (
    <div className='relative box-border size-full bg-grey-100' ref={containerRef}>
      {!isLoading && pdf && pageHeights.length > 0 ?
        <>
          {isMobile() ? null : <div className='mobile-font-24 absolute bottom-0 z-[1] flex w-full justify-center pb-1'>
            <div className='flex items-center gap-0.25 rounded-large bg-white-999 p-0.25 shadow-card-x3'>
              <Button
                className='!rounded-[100%]'
                disabled={zoomFactor <= MIN_ZOOM}
                icon='only'
                iconid='minus'
                onClick={handleZoomOut}
                size='normal'
                type='grey'
              />
              <span className='text-font-4 font-[600]'>{`${Math.round(zoomFactor * 100)}%`}</span>
              <Button
                className='!rounded-[100%]'
                disabled={zoomFactor >= MAX_ZOOM}
                icon='only'
                iconid='plus'
                onClick={handleZoomIn}
                size='normal'
                type='grey'
              />
            </div>
          </div>}
          {!isMobile() && <div className='absolute right-1.125 top-0.75 z-[1]'>
            <Button
              className='!rounded-[100%] shadow-card-x3'
              icon='only'
              iconid={isFullscreen ? 'arrow-collapse' : 'arrow-expand-3f'}
              onClick={toggleFullscreen}
              size='medium'
              type='white'
            />
          </div>}
          <AutoSizer>
            {({
              height,
              width,
            }: {
              height: number,
              width: number,
            }) =>
              <List
                height={height}
                innerElementType={Inner(maxPageWidth * zoomFactor, width)}
                itemCount={pdf.numPages}
                itemSize={getPageHeight}
                outerElementType={Outer}
                outerRef={scrollContainerRef}
                ref={listRef}
                width={width}
              >
                {({
                  index,
                  style,
                }: {
                  index: number,
                  style: React.CSSProperties,
                }) =>
                  <Page
                    index={index}
                    renderPage={renderPage}
                    style={style}
                  />
                }
              </List>
            }
          </AutoSizer>
        </>
        :
        <Spinner />
      }
    </div>
  );
};
