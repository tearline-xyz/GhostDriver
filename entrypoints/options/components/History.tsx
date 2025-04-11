import React, { useState, useEffect } from "react"
import { ClearAllIcon, ShareIcon } from "../../../assets/icons"
import { TaskContext, TaskState } from "../../common/models/task"
import TaskResultModal from "./TaskResultModal"
import "./History.css"

interface HistoryProps {
  allTasks: TaskContext[];
  handleClearHistory: () => void;
  showStatus: (message: string, type: string, duration?: number) => void;
}

const History: React.FC<HistoryProps> = ({
  allTasks,
  handleClearHistory,
  showStatus,
}) => {
  // 使用React state管理模态窗口显示状态和当前选中的任务
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 获取当前选中的任务上下文
  const selectedTaskContext = allTasks.find(task => task.id === selectedTaskId) || null;

  // 从URL参数中获取任务ID和动作
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("taskId");
    const action = urlParams.get("action");

    // 如果URL中有任务ID和share动作，打开相应的模态窗口
    if (taskId && action === "share") {
      const task = allTasks.find(task => task.id === taskId);
      if (task) {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
        showStatus("Reviewing shared task...", "info");
      }
    }
  }, [allTasks, showStatus]);

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

  // 将UTC时间格式化为本地时间
  const formatLocalTime = (utcTimestamp: string) => {
    if (!utcTimestamp) return "";

    try {
      const date = new Date(utcTimestamp);
      return date.toLocaleString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return utcTimestamp;
    }
  };

  // 打开分享模态窗口
  const openShareModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
    showStatus("Reviewing shared task...", "info");
  };

  // 关闭分享模态窗口
  const closeShareModal = () => {
    setIsModalOpen(false);
    setSelectedTaskId(null);

    // 如果是通过URL参数打开的，关闭后清除URL参数
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("taskId") && urlParams.has("action")) {
      const newUrl = window.location.pathname + "?page=History";
      window.history.replaceState({}, "", newUrl);
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
                    {formatLocalTime(task.created_at)}
                  </span>
                  {task.state === TaskState.COMPLETED && (
                    <button
                      className="icon-share-button"
                      onClick={() => openShareModal(task.id)}
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

        {/* 使用React状态控制模态窗口显示 */}
        {isModalOpen && selectedTaskContext && (
          <TaskResultModal
            taskContext={selectedTaskContext}
            onClose={closeShareModal}
          />
        )}
      </div>
    </>
  )
}

export default History
