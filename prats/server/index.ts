import { boolean, capsule, endpoint, mutation, query, string, table, text } from "lakebed/server";
import { cleanTodoText } from "../shared/todo";

export default capsule({
  name: "prats",

  schema: {
    todos: table({
      text: string(),
      done: boolean().default(false),
      ownerId: string()
    })
  },

  queries: {
    todos: query((ctx) =>
      ctx.db.todos
        .where("ownerId", ctx.auth.userId)
        .orderBy("createdAt", "desc")
        .all()
    )
  },

  mutations: {
    addTodo: mutation((ctx, text: string) => {
      const cleanText = cleanTodoText(text);
      if (!cleanText) {
        return;
      }

      ctx.db.todos.insert({ text: cleanText, ownerId: ctx.auth.userId });
    })
  },

  endpoints: {
    status: endpoint({ method: "GET", path: "/api/status" }, () => text("ok"))
  }
});
