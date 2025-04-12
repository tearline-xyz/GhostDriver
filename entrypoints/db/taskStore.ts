import { TaskContext, TaskState } from "../common/models/task";
import { TASK_STORE_NAME } from "./constants";
import { openDatabase } from "./database";

/**
 * Add a task
 */
export async function addTask(task: TaskContext): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(TASK_STORE_NAME, "readwrite");
  const store = transaction.objectStore(TASK_STORE_NAME);
  store.add(task);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get all tasks
 */
export async function getAllTasksSortedByCreatedAt(): Promise<TaskContext[]> {
  const db = await openDatabase();
  const transaction = db.transaction(TASK_STORE_NAME, "readonly");
  const store = transaction.objectStore(TASK_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const tasks = request.result;
      // Sort by creation time in descending order
      tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      resolve(tasks);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<TaskContext | undefined> {
  const db = await openDatabase();
  const transaction = db.transaction(TASK_STORE_NAME, "readonly");
  const store = transaction.objectStore(TASK_STORE_NAME);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update task
 */
export async function updateTask(task: TaskContext): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(TASK_STORE_NAME, "readwrite");
  const store = transaction.objectStore(TASK_STORE_NAME);
  store.put(task);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Delete task
 */
export async function deleteTask(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(TASK_STORE_NAME, "readwrite");
  const store = transaction.objectStore(TASK_STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Clear all tasks
 */
export async function clearAllTasks(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(TASK_STORE_NAME, "readwrite");
  const store = transaction.objectStore(TASK_STORE_NAME);
  store.clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
