"use client";

import { ChatLayout } from "@/components/layout/ChatLayout";
import { UploadScreen } from "@/components/upload/UploadScreen";
import { SessionProvider, useSession } from "@/state/SessionProvider";

function App() {
  const { state } = useSession();
  return state.phase === "chat" ? <ChatLayout /> : <UploadScreen />;
}

export default function Home() {
  return (
    <SessionProvider>
      <App />
    </SessionProvider>
  );
}
