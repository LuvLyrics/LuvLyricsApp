import { Link, Route, Router, Routes, SignInWithGoogle, signOut, useAuth, useMutation, useQuery } from "lakebed/client";
import { useState } from "preact/hooks";
import { cleanTodoText, type Todo } from "../shared/todo";

function AuthAvatar({ label, picture }: { label: string; picture?: string }) {
  const initial = label.trim().slice(0, 1).toUpperCase() || "?";

  if (picture) {
    return (
      <img
        alt=""
        className="h-7 w-7 shrink-0 rounded-full border border-neutral-800 bg-neutral-900 object-cover"
        referrerPolicy="no-referrer"
        src={picture}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-xs font-medium text-neutral-300"
    >
      {initial}
    </span>
  );
}

function TodoPage() {
  const todos = useQuery<Todo[]>("todos");
  const addTodo = useMutation<[text: string], void>("addTodo");

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const text = cleanTodoText(String(data.get("text") ?? ""));
    if (!text) {
      return;
    }

    await addTodo(text);
    form.reset();
  }

  return (
    <section>
      <h1 className="mb-8 text-5xl font-bold tracking-tight">prats</h1>
      <form className="mb-8 flex gap-3" onSubmit={(event) => void onSubmit(event)}>
        <input className="min-w-0 flex-1 border border-neutral-700 bg-black px-3 py-2 text-white outline-none focus:border-white" name="text" placeholder="Add a todo" />
        <button className="border border-white px-4 py-2 font-medium" type="submit">Add</button>
      </form>
      <ul className="divide-y divide-neutral-800 border-y border-neutral-800">
        {todos.map((todo) => (
          <li className="py-3" key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </section>
  );
}

function StatusPage() {
  const [status, setStatus] = useState("not checked");

  async function checkStatus() {
    const response = await fetch("api/status");
    setStatus(response.ok ? await response.text() : "error " + response.status);
  }

  return (
    <section>
      <h1 className="mb-4 text-4xl font-bold tracking-tight">Status</h1>
      <p className="mb-6 text-neutral-400">This route calls the server endpoint at /api/status.</p>
      <button className="border border-white px-4 py-2 font-medium" type="button" onClick={() => void checkStatus()}>
        Check endpoint
      </button>
      <p className="mt-4 font-mono text-sm text-neutral-400">endpoint: {status}</p>
    </section>
  );
}

export function App() {
  const auth = useAuth();
  const authLabel = auth.displayName;
  const authStatus = auth.isLoading && auth.isGuest ? "checking session" : "signed in as " + authLabel;

  return (
    <Router>
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <section className="mx-auto max-w-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {!auth.isLoading ? <AuthAvatar label={authLabel} picture={auth.picture} /> : null}
              <p className="min-w-0 truncate font-mono text-sm text-neutral-500">{authStatus}</p>
            </div>
            {!auth.isLoading && auth.isGuest ? (
              <SignInWithGoogle className="shrink-0 border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:border-white hover:text-white" />
            ) : !auth.isLoading ? (
              <button className="shrink-0 text-sm text-neutral-400 hover:text-white" type="button" onClick={() => signOut()}>
                Sign out
              </button>
            ) : null}
          </div>
          <nav className="mb-8 flex gap-4 text-sm text-neutral-400">
            <Link className="hover:text-white" to="/">Todos</Link>
            <Link className="hover:text-white" to="/status">Status</Link>
          </nav>
          <Routes>
            <Route path="/" element={<TodoPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="*" element={<section><h1 className="mb-4 text-4xl font-bold">Not found</h1><Link className="text-neutral-300 hover:text-white" to="/">Back to todos</Link></section>} />
          </Routes>
        </section>
      </main>
    </Router>
  );
}
