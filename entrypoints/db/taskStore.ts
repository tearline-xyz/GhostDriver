import { TaskContext, TaskState } from "../common/models/task";
import { TASK_STORE_NAME } from "./constants";
import { openDatabase } from "./database";

/**
 * 添加任务
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
 * 获取所有任务
 */
export async function getAllTasksSortedByCreatedAt(): Promise<TaskContext[]> {
  const db = await openDatabase();
  const transaction = db.transaction(TASK_STORE_NAME, "readonly");
  const store = transaction.objectStore(TASK_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const tasks = request.result;
      // 按创建时间降序排序
      tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      resolve(tasks);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 根据ID获取任务
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
 * 更新任务
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
 * 删除任务
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
 * 清空所有任务
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
