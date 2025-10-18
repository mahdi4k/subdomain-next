import { FC } from "react";

interface LoginPageProps {
  params: {
    sub: string; // e.g. 'car', 'bike'
  };
}

export default async function Page({ params }: any) {
  const { sub } = params.params;
  return <div>{sub}</div>;
};

 