export default function Messages({ messages }) {
  return (
    <div className="border p-2 rounded w-full h-32 overflow-y-auto mb-4 bg-white">
      {messages.map((msg, idx) => (
        <p key={idx} className="mb-1">{msg}</p>
      ))}
    </div>
  );
}
