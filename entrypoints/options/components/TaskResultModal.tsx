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
          center: true,
          hash: false,
          transition: "slide",
          width: "100%",
          height: "100%",
          margin: 0,
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
          <span className="task-id-title">Task ID: {taskContext.id}</span>
          <button className="modal-close" onClick={onClose} />
        </div>
        <div className="modal-body">
          {!taskContext.result?.history ? (
            <div className="loading">Loading task history...</div>
          ) : (
            <div className="reveal" ref={deckDivRef}>
              <div className="slides">
                {/* Cover Slide */}
                <section data-auto-animate>
                  <span>Task ID: {taskContext.id}</span>
                  <p>Generated on: {taskContext.created_at}</p>
                  <p className="model-info">
                    Powered by {taskContext.chat_model_tag}
                  </p>
                </section>

                {/* Overview Slide */}
                <section data-auto-animate>
                  <h2>Task Overview</h2>
                  <div className="overview-container">
                    <div className="query-box">
                      <p>
                        <strong>Final State:</strong> "{taskContext.state}"
                      </p>
                      <p>
                        <strong>Total Steps:</strong>{" "}
                        {taskContext.result.history.length}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Journey Slide */}
                <section>
                  <h2>Journey</h2>
                  <div className="journey-timeline">
                    {taskContext.result.history.map((step, index) => (
                      <div className="journey-step" key={`journey-${index}`}>
                        <div className="step-number">{index + 1}</div>
                        <div className="step-details"></div>
                      </div>
                    ))}
                  </div>
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
