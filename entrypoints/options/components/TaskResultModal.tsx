import React, { useEffect, useRef } from "react"
import Reveal from "reveal.js"
import "reveal.js/dist/reveal.css"
import "reveal.js/dist/theme/black.css"
import hljs from "highlight.js"
import "highlight.js/styles/github-dark.css"
import "./TaskResultModal.css"
import { TaskContext } from "../../common/models/task"
import { EXTENSION_NAME } from "../../common/settings"

interface TaskResultModalProps {
  taskContext: TaskContext
  onClose: () => void
}

const TaskResultModal: React.FC<TaskResultModalProps> = ({
  taskContext,
  onClose,
}) => {
  const deckDivRef = useRef<HTMLDivElement>(null)
  const deckRef = useRef<Reveal.Api | null>(null)

  // 初始化 Reveal.js
  useEffect(() => {
    console.log("Current taskContext:", taskContext)
    console.log("History data:", taskContext.result?.history)

    const initializeReveal = async () => {
      // 等待一个渲染周期
      await new Promise((resolve) => setTimeout(resolve, 0))

      if (!deckDivRef.current || !taskContext.result?.history) {
        console.log("Missing required data for Reveal.js initialization")
        return
      }

      // 如果已经有实例，先销毁
      if (deckRef.current) {
        deckRef.current.destroy()
        deckRef.current = null
      }

      try {
        deckRef.current = new Reveal(deckDivRef.current, {
          // Display presentation control arrows
          controls: true,

          // Help the user learn the controls by providing hints, for example by
          // bouncing the down arrow when they first encounter a vertical slide
          controlsTutorial: true,

          // Determines where controls appear, "edges" or "bottom-right"
          controlsLayout: "edges",

          // Visibility rule for backwards navigation arrows; "faded", "hidden"
          // or "visible"
          controlsBackArrows: "faded",

          // Display a presentation progress bar
          progress: true,

          // Display the page number of the current slide
          // - true:    Show slide number
          // - false:   Hide slide number
          //
          // Can optionally be set as a string that specifies the number formatting:
          // - "h.v":   Horizontal . vertical slide number (default)
          // - "h/v":   Horizontal / vertical slide number
          // - "c":   Flattened slide number
          // - "c/t":   Flattened slide number / total slides
          //
          // Alternatively, you can provide a function that returns the slide
          // number for the current slide. The function should take in a slide
          // object and return an array with one string [slideNumber] or
          // three strings [n1,delimiter,n2]. See #formatSlideNumber().
          slideNumber: false,

          // Can be used to limit the contexts in which the slide number appears
          // - "all":      Always show the slide number
          // - "print":    Only when printing to PDF
          // - "speaker":  Only in the speaker view
          showSlideNumber: "all",

          // Use 1 based indexing for # links to match slide number (default is zero
          // based)
          hashOneBasedIndex: false,

          // Add the current slide number to the URL hash so that reloading the
          // page/copying the URL will return you to the same slide
          hash: false,

          // Flags if we should monitor the hash and change slides accordingly
          respondToHashChanges: true,

          // Enable support for jump-to-slide navigation shortcuts
          // jumpToSlide: true,

          // Push each slide change to the browser history.  Implies `hash: true`
          history: false,

          // Enable keyboard shortcuts for navigation
          keyboard: true,

          // Optional function that blocks keyboard events when retuning false
          //
          // If you set this to 'focused', we will only capture keyboard events
          // for embedded decks when they are in focus
          keyboardCondition: null,

          // Disables the default reveal.js slide layout (scaling and centering)
          // so that you can use custom CSS layout
          disableLayout: false,

          // Enable the slide overview mode
          overview: true,

          // Vertical centering of slides
          center: true,

          // Enables touch navigation on devices with touch input
          touch: true,

          // Loop the presentation
          loop: false,

          // Change the presentation direction to be RTL
          rtl: false,

          // Changes the behavior of our navigation directions.
          //
          // "default"
          // Left/right arrow keys step between horizontal slides, up/down
          // arrow keys step between vertical slides. Space key steps through
          // all slides (both horizontal and vertical).
          //
          // "linear"
          // Removes the up/down arrows. Left/right arrows step through all
          // slides (both horizontal and vertical).
          //
          // "grid"
          // When this is enabled, stepping left/right from a vertical stack
          // to an adjacent vertical stack will land you at the same vertical
          // index.
          //
          // Consider a deck with six slides ordered in two vertical stacks:
          // 1.1    2.1
          // 1.2    2.2
          // 1.3    2.3
          //
          // If you're on slide 1.3 and navigate right, you will normally move
          // from 1.3 -> 2.1. If "grid" is used, the same navigation takes you
          // from 1.3 -> 2.3.
          navigationMode: "default",

          // Randomizes the order of slides each time the presentation loads
          shuffle: false,

          // Turns fragments on and off globally
          fragments: true,

          // Flags whether to include the current fragment in the URL,
          // so that reloading brings you to the same fragment position
          fragmentInURL: true,

          // Flags if the presentation is running in an embedded mode,
          // i.e. contained within a limited portion of the screen
          embedded: false,

          // Flags if we should show a help overlay when the question-mark
          // key is pressed
          help: true,

          // Flags if it should be possible to pause the presentation (blackout)
          pause: true,

          // Flags if speaker notes should be visible to all viewers
          showNotes: false,

          // Global override for autolaying embedded media (video/audio/iframe)
          // - null:   Media will only autoplay if data-autoplay is present
          // - true:   All media will autoplay, regardless of individual setting
          // - false:  No media will autoplay, regardless of individual setting
          autoPlayMedia: null,

          // Global override for preloading lazy-loaded iframes
          // - null:   Iframes with data-src AND data-preload will be loaded when within
          //           the viewDistance, iframes with only data-src will be loaded when visible
          // - true:   All iframes with data-src will be loaded when within the viewDistance
          // - false:  All iframes with data-src will be loaded only when visible
          preloadIframes: null,

          // Can be used to globally disable auto-animation
          autoAnimate: true,

          // Optionally provide a custom element matcher that will be
          // used to dictate which elements we can animate between.
          autoAnimateMatcher: null,

          // Default settings for our auto-animate transitions, can be
          // overridden per-slide or per-element via data arguments
          autoAnimateEasing: "ease",
          autoAnimateDuration: 1.0,
          autoAnimateUnmatched: true,

          // CSS properties that can be auto-animated. Position & scale
          // is matched separately so there's no need to include styles
          // like top/right/bottom/left, width/height or margin.
          autoAnimateStyles: [
            "opacity",
            "color",
            "background-color",
            "padding",
            "font-size",
            "line-height",
            "letter-spacing",
            "border-width",
            "border-color",
            "border-radius",
            "outline",
            "outline-offset",
          ],

          // Controls automatic progression to the next slide
          // - 0:      Auto-sliding only happens if the data-autoslide HTML attribute
          //           is present on the current slide or fragment
          // - 1+:     All slides will progress automatically at the given interval
          // - false:  No auto-sliding, even if data-autoslide is present
          autoSlide: 0,

          // Stop auto-sliding after user input
          autoSlideStoppable: true,

          // Use this method for navigation when auto-sliding (defaults to navigateNext)
          autoSlideMethod: null,

          // Specify the average time in seconds that you think you will spend
          // presenting each slide. This is used to show a pacing timer in the
          // speaker view
          defaultTiming: null,

          // Enable slide navigation via mouse wheel
          mouseWheel: false,

          // Opens links in an iframe preview overlay
          // Add `data-preview-link` and `data-preview-link="false"` to customise each link
          // individually
          previewLinks: false,

          // Exposes the reveal.js API through window.postMessage
          postMessage: true,

          // Dispatches all reveal.js events to the parent window through postMessage
          postMessageEvents: false,

          // Focuses body when page changes visibility to ensure keyboard shortcuts work
          focusBodyOnPageVisibilityChange: true,

          // Transition style
          transition: "slide", // none/fade/slide/convex/concave/zoom

          // Transition speed
          transitionSpeed: "default", // default/fast/slow

          // Transition style for full page slide backgrounds
          backgroundTransition: "fade", // none/fade/slide/convex/concave/zoom

          // The maximum number of pages a single slide can expand onto when printing
          // to PDF, unlimited by default
          pdfMaxPagesPerSlide: Number.POSITIVE_INFINITY,

          // Prints each fragment on a separate slide
          pdfSeparateFragments: true,

          // Offset used to reduce the height of content within exported PDF pages.
          // This exists to account for environment differences based on how you
          // print to PDF. CLI printing options, like phantomjs and wkpdf, can end
          // on precisely the total height of the document whereas in-browser
          // printing has to end one pixel before.
          pdfPageHeightOffset: -1,

          // Number of slides away from the current that are visible
          viewDistance: 3,

          // Number of slides away from the current that are visible on mobile
          // devices. It is advisable to set this to a lower number than
          // viewDistance in order to save resources.
          mobileViewDistance: 2,

          // The display mode that will be used to show slides
          display: "block",

          // Hide cursor if inactive
          hideInactiveCursor: true,

          // Time before the cursor is hidden (in ms)
          hideCursorTime: 5000,
        })

        await deckRef.current.initialize()

        // 初始化代码高亮
        document.querySelectorAll("pre code").forEach((block) => {
          hljs.highlightElement(block as HTMLElement)
        })

        console.log("Reveal.js initialized successfully")
      } catch (error) {
        console.error("Failed to initialize Reveal.js:", error)
      }
    }

    initializeReveal()

    return () => {
      if (deckRef.current) {
        deckRef.current.destroy()
        deckRef.current = null
      }
    }
  }, [taskContext.result?.history])

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-body">
          {!taskContext.result?.history ? (
            <div className="loading">Loading task history...</div>
          ) : (
            <div className="reveal" ref={deckDivRef}>
              <div className="slides">
                {/* Redesigned Overview Slide with task content */}
                <section data-auto-animate>
                  <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>
                    Overview
                  </h2>

                  <div className="modal-task-overview">
                    <div className="modal-task-meta-info">
                      <span>{taskContext.id}</span>
                      <span>
                        {taskContext.state} after{" "}
                        {taskContext.result.history.length} steps
                      </span>
                    </div>

                    <div className="modal-task-content">
                      {taskContext.content}
                    </div>

                    <div className="modal-task-powered-by">
                      Powered by {EXTENSION_NAME} and{" "}
                      {taskContext.chat_model_tag}
                    </div>
                  </div>
                </section>

                {/* Journey Slide */}
                {taskContext.result.history.map((step, index) => (
                  <section key={`journey-${index}`} data-auto-animate>
                    <h2 style={{ fontSize: "24px", marginBottom: "10px" }}>
                      Step {index + 1}
                    </h2>
                    <div className="browser-frame">
                      <div className="browser-header">
                        <div className="browser-controls">
                          <div className="browser-dot dot-red"></div>
                          <div className="browser-dot dot-yellow"></div>
                          <div className="browser-dot dot-green"></div>
                        </div>
                        <div className="browser-address-bar">
                          {step.state.url}
                        </div>
                      </div>
                      <div className="browser-content">
                        <div className="skeleton-screen">
                          <div className="skeleton-header">
                            <div className="skeleton-nav"></div>
                            <div className="skeleton-search"></div>
                          </div>
                          <div className="skeleton-main">
                            <div className="skeleton-line long"></div>
                            <div className="skeleton-line medium"></div>
                            <div className="skeleton-card"></div>
                            <div className="skeleton-line short"></div>
                            <div className="skeleton-line medium"></div>
                          </div>
                          <div className="skeleton-sidebar">
                            <div className="skeleton-card"></div>
                            <div className="skeleton-line short"></div>
                            <div className="skeleton-line medium"></div>
                          </div>
                        </div>
                        <div className="step-info">
                          <p>
                            <strong>State:</strong>{" "}
                            {step.state.title || "Untitled"}
                          </p>
                          <p>
                            <strong>Memory:</strong>{" "}
                            {step.model_output.current_state.memory}
                          </p>
                          <p>
                            <strong>Next Goal:</strong>{" "}
                            {step.model_output.current_state.next_goal}
                          </p>
                          <p>
                            <strong>Step Time:</strong>{" "}
                            {new Date(
                              step.metadata.step_start_time * 1000
                            ).toLocaleString()}{" "}
                            -{" "}
                            {new Date(
                              step.metadata.step_end_time * 1000
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="share-button" onClick={onClose}>
            Confirm and Share
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskResultModal
