export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-6 h-[calc(100dvh-4rem)] overflow-hidden lg:h-[calc(100vh-4rem)]">
      {children}
    </div>
  )
}
