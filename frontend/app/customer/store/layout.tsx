import Chatbot from "@/components/chatbot/Chatbot";

export default function CustomerStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Chatbot />
    </>
  );
}
