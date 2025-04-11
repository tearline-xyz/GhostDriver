import React from "react"
import { ClearAllIcon, ShareIcon } from "../../../assets/icons"
import { TaskContext, TaskState } from "../../common/models/task"
import TaskResultModal from "./TaskResultModal"
import "./History.css"

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
  // 获取状态标签的样式
  const getStateStyle = (state: TaskState) => {
    switch (state) {
      case TaskState.COMPLETED:
        return { background: '#e6f4ea', color: '#137333' };
      case TaskState.FAILED:
        return { background: '#fce8e6', color: '#c5221f' };
      case TaskState.RUNNING:
        return { background: '#e8f0fe', color: '#1a73e8' };
      default:
        return { background: '#f1f3f4', color: '#5f6368' };
    }
  };

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
                  <span className="task-id">{task.id}</span>
                  <span className="task-state" style={getStateStyle(task.state as TaskState)}>{task.state}</span>
                  <span className="task-time">
                    {task.created_at}
                  </span>
                  {task.state === TaskState.COMPLETED && (
                    <button
                      className="icon-share-button"
                      onClick={() => {
                        const newUrl = `${window.location.pathname}?page=History&taskId=${task.id}&action=share`;
                        window.history.pushState({}, "", newUrl);
                        window.location.reload();
                        showStatus("Opening share modal...", "info");
                      }}
                      title="Share"
                    >
                      <img src={ShareIcon} alt="Share" />
                    </button>
                  )}
                </div>
                <div className="task-input">{task.content}</div>
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
