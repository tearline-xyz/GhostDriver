import React, { useEffect, useRef } from "react"
import Reveal from "reveal.js"
import "reveal.js/dist/reveal.css"
import "reveal.js/dist/theme/black.css"
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
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
          embedded: true,
          controls: true,
          progress: true,
          center: false, // Disable centering to allow titles to stay at the top
          hash: false,
          transition: "slide",
          width: "100%",
          height: "100%",
          margin: 0,
          navigationMode: "default"
        })

        await deckRef.current.initialize()

        // 初始化代码高亮
        document.querySelectorAll('pre code').forEach((block) => {
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
                  <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Overview</h2>

                  <div className="modal-task-overview">
                    <div className="modal-task-meta-info">
                      <span>{taskContext.id}</span>
                      <span>{taskContext.state} after {taskContext.result.history.length} steps</span>
                    </div>

                    <div className="modal-task-content">{taskContext.content}</div>

                    <div className="modal-task-powered-by">
                      Powered by {EXTENSION_NAME} and {taskContext.chat_model_tag}
                    </div>
                  </div>
                </section>

                {/* Journey Slide */}
                {taskContext.result.history.map((step, index) => (
                  <section key={`journey-${index}`} data-auto-animate >
                    <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Step {index + 1}</h2>
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
                          <p><strong>State:</strong> {step.state.title || "Untitled"}</p>
                          <p><strong>Memory:</strong> {step.model_output.current_state.memory}</p>
                          <p><strong>Next Goal:</strong> {step.model_output.current_state.next_goal}</p>
                          <p><strong>Step Time:</strong> {new Date(step.metadata.step_start_time * 1000).toLocaleString()} - {new Date(step.metadata.step_end_time * 1000).toLocaleString()}</p>
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
