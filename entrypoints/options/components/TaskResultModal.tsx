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
        <div className="modal-header">
          <span className="task-id-title">Task completed ✔</span>
          <button className="modal-close" onClick={onClose} />
        </div>
        <div className="modal-body">
          {!taskContext.result?.history ? (
            <div className="loading">Loading task history...</div>
          ) : (
            <div className="reveal" ref={deckDivRef}>
              <div className="slides">
              <section>
                {/* Overview Slide */}
                <section data-auto-animate>
                  <h2 style={{ fontSize: '24px' }}>Task Overview</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '16px' }}>
                    <p><strong>Task ID:</strong> {taskContext.id}</p>
                    <p><strong>Generated on:</strong> {taskContext.created_at}</p>
                    <p><strong>Powered by:</strong> {EXTENSION_NAME} and {taskContext.chat_model_tag}</p>
                    <p><strong>Final State:</strong> {taskContext.state}</p>
                    <p><strong>Total Steps:</strong> {taskContext.result.history.length}</p>
                  </div>
                </section>

                {/* Task Details Slide */}
                <section data-auto-animate>
                  <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Task Details</h2>
                  <pre style={{
                    margin: '0 20px',
                    padding: '15px',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    borderRadius: '8px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    textAlign: 'left',
                    height: 'calc(100% - 100px)',
                    maxHeight: '100%',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.1)'
                  }}>
                    <code className="language-markdown" style={{
                      display: 'block',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '16px',
                      color: '#e0e0e0'
                    }}>{taskContext.content}</code>
                  </pre>
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
                </section>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="share-button" onClick={onClose}>
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskResultModal
