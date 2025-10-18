// app/[sub]/login/page.tsx
import LoginPage from "./_component/LoginPage";

export default async function Page({ params }: any) {
  const { sub } = await params;
  return (
    <div>
      <LoginPage type={sub} />
    </div>
  );
}
