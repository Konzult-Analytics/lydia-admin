export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-frankly-gray mr-1">Lydia is thinking</span>
          <span className="h-1.5 w-1.5 rounded-full bg-frankly-green animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-frankly-green animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-frankly-green animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
