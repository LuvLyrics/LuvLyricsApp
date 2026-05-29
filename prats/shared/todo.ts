export type Todo = {
  id: string;
  text: string;
  done: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export function cleanTodoText(value: string): string {
  return value.trim().slice(0, 160);
}
