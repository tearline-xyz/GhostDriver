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

const TaskResultModal: React.FC<TaskResultModalProps> = ({ taskContext, onClose }) => {
  const deckDivRef = useRef<HTMLDivElement>(null)
  const deckRef = useRef<Reveal.Api | null>(null)

  // 初始化 Reveal.js
  useEffect(() => {
    console.log('Current taskContext:', taskContext)
    console.log('History data:', taskContext.result?.history)

    const initializeReveal = async () => {
      // 等待一个渲染周期
      await new Promise(resolve => setTimeout(resolve, 0))

      if (!deckDivRef.current || !taskContext.result?.history) {
        console.log('Missing required data for Reveal.js initialization')
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
          transition: 'slide',
          width: '100%',
          height: '100%',
          margin: 0,
        })

        await deckRef.current.initialize()
        console.log('Reveal.js initialized successfully')
      } catch (error) {
        console.error('Failed to initialize Reveal.js:', error)
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
                {taskContext.result.history.map((step, index) => (
                  <section key={index} data-transition="slide">
                    <span>Step {step.metadata.step_number-1}</span>
                    <div>
                      <div>
                        <pre>{JSON.stringify(step.model_output, null, 2)}</pre>
                      </div>
                      <div>
                        <h5>Result</h5>
                        <pre>{JSON.stringify(step.result, null, 2)}</pre>
                      </div>
                      <div>
                        <h5>State</h5>
                        <pre>{JSON.stringify(step.state, null, 2)}</pre>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="share-button"
            onClick={onClose}
          >
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskResultModal
