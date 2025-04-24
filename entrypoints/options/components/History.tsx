import React, { useState, useEffect } from "react"
import { ClearAllIcon, ShareIcon, PowerIcon, ComputingIcon } from "../../../assets/icons"
import { TaskContext, TaskState } from "../../common/models/task"
import TaskResultModal from "./TaskResultModal"
import useAuth from "../../auth/useAuth"
import { AuthStatus } from "../../auth/models"
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
  // Use React state to manage modal window display state and currently selected task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { authStatus } = useAuth();

  // Get the currently selected task context
  const selectedTaskContext = allTasks.find(task => task.id === selectedTaskId) || null;

  // Get task ID and action from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("taskId");
    const action = urlParams.get("action");

    // If URL has task ID and share action, open the corresponding modal window
    if (taskId && action === "share") {
      const task = allTasks.find(task => task.id === taskId);
      if (task) {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
        showStatus("Reviewing shared task...", "info");
      }
    }
  }, [allTasks, showStatus]);

  // Get styling for status labels
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

  // Format UTC time to local time
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

  // Open share modal window
  const openShareModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
    showStatus("Reviewing shared task...", "info");
  };

  // Close share modal window
  const closeShareModal = () => {
    setIsModalOpen(false);
    setSelectedTaskId(null);

    // If opened via URL parameters, clear them when closing
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("taskId") && urlParams.has("action")) {
      const newUrl = window.location.pathname + "?page=History";
      window.history.replaceState({}, "", newUrl);
    }
  };

  // If user is not logged in, only show the prompt text
  if (authStatus !== AuthStatus.SUCCESS) {
    return (
      <div className="login-notice">
        Please login before viewing history.
      </div>
    );
  }

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
                  <div className="task-points-container">
                    {task.result?.points_consumption && (
                      <span className="task-points">
                        {Object.entries(task.result.points_consumption)
                          .filter(([_, value]) => value !== 0)
                          .map(([key, value]) => (
                            <span key={key} className="points-item points-consumption">
                              <img
                                src={key === 'power' ? PowerIcon : ComputingIcon}
                                alt={key}
                                className="points-icon"
                              />
                              <span className="points-value">-{value}</span>
                            </span>
                          ))}
                      </span>
                    )}
                    {task.result?.points_reward && (
                      <span className="task-points">
                        {Object.entries(task.result.points_reward)
                          .filter(([_, value]) => value !== 0)
                          .map(([key, value]) => (
                            <span key={key} className="points-item points-reward">
                              <img
                                src={key === 'power' ? PowerIcon : ComputingIcon}
                                alt={key}
                                className="points-icon"
                              />
                              <span className="points-value">+{value}</span>
                            </span>
                          ))}
                      </span>
                    )}
                  </div>
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

        {/* Use React state to control modal window display */}
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
