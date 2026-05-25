/**
 * Short URL redirect page.
 * The actual redirect (301) is handled by the backend.
 * This page is a fallback if JavaScript is disabled.
 */

import { redirect } from "next/navigation";

type Props = { params: Promise<{ code: string }> };

export default async function ShortUrlPage({ params }: Props) {
  const { code } = await params;
  redirect(`/api/v1/s/${code}`);
}
