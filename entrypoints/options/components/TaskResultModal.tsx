import React, { useEffect, useRef } from "react"
import Reveal from "reveal.js"
import "reveal.js/dist/reveal.css"
import "reveal.js/dist/theme/black.css"
import { TaskContext } from "../../common/model/task"
import "./TaskResultModal.css"

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
                    <p><strong>Powered by:</strong> GhostDriver and {taskContext.chat_model_tag}</p>
                    <p><strong>Final State:</strong> {taskContext.state}</p>
                    <p><strong>Total Steps:</strong> {taskContext.result.history.length}</p>
                  </div>
                </section>

                {/* Task Details Slide */}
                <section data-auto-animate>
                  <h2 style={{ fontSize: '24px' }}>Task Details</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', fontSize: '16px', color: '#fff' }}>
                    <div style={{ border: '1px solid #ccc', borderRadius: '10px', padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <p>{taskContext.content}</p>
                    </div>
                  </div>
                </section>

                {/* Journey Slide */}
                {taskContext.result.history.map((step, index) => (
                  <section key={`journey-${index}`} data-auto-animate >
                    <h2 style={{ fontSize: '24px' }}>Step {index + 1}</h2>
                    <div style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', color: '#fff', fontSize: '14px' }}>
                      <p><strong>State:</strong> {step.state.title || "Untitled"}</p>
                      <p><strong>URL:</strong> {step.state.url}</p>
                      <p><strong>Memory:</strong> {step.model_output.current_state.memory}</p>
                      <p><strong>Next Goal:</strong> {step.model_output.current_state.next_goal}</p>
                      <p><strong>Step Time:</strong> {new Date(step.metadata.step_start_time * 1000).toLocaleString()} - {new Date(step.metadata.step_end_time * 1000).toLocaleString()}</p>
                      {step.state.screenshot && (
                        <img src={step.state.screenshot} alt={`Screenshot for step ${index + 1}`} style={{ width: '100%', borderRadius: '10px', marginTop: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)' }} />
                      )}
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
