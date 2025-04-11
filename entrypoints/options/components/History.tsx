import React from "react"
import { ClearAllIcon } from "../../../assets/icons"
import { TaskContext, TaskState } from "../../common/models/task"
import TaskResultModal from "./TaskResultModal"

interface HistoryProps {
  allTasks: TaskContext[];
  focusedTaskContext: TaskContext | null;
  handleClearHistory: () => void;
  showStatus: (message: string, type: string, duration?: number) => void;
}

const History: React.FC<HistoryProps> = ({
  allTasks,
  focusedTaskContext,
  handleClearHistory,
  showStatus,
}) => {
  return (
    <>
      <div className="history-header">
        <h2>History</h2>
        <button
          className="clear-history-button"
          onClick={handleClearHistory}
          disabled={allTasks.length === 0}
        >
          <img src={ClearAllIcon} alt="Delete" />
          Clear History
        </button>
      </div>
      <div className="history-container">
        {allTasks.length === 0 ? (
          <p>No historical tasks found.</p>
        ) : (
          <div className="task-list">
            {allTasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-header">
                  <span className="task-id">Task ID: {task.id}</span>
                  <span className="task-state">{task.state}</span>
                  <span className="task-time">
                    {task.created_at}
                  </span>
                </div>
                <div className="task-input">{task.content}</div>
                <div className="task-actions">
                  <button
                    className="share-button"
                    onClick={() => {
                      const newUrl = `${window.location.pathname}?page=History&taskId=${task.id}&action=share`;
                      window.history.pushState({}, "", newUrl);
                      window.location.reload();
                    }}
                    disabled={task.state !== TaskState.COMPLETED}
                  >
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 模态窗口 */}
        {(() => {
          const urlParams = new URLSearchParams(window.location.search)
          const taskId = urlParams.get("taskId")
          const action = urlParams.get("action")

          if (taskId && action === "share" && focusedTaskContext) {
            return (
              <TaskResultModal
                taskContext={focusedTaskContext}
                onClose={() => {
                  const newUrl = window.location.pathname + "?page=History"
                  window.history.replaceState({}, "", newUrl)
                  window.location.reload()
                }}
              />
            )
          }
          return null
        })()}
      </div>
    </>
  )
}

export default History
