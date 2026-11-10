import { PageHeader, Panel } from "@/components/ui";
import { StockSearchBox } from "@/components/StockSearchBox";
import { SearchResults } from "./SearchResults";

export const metadata = { title: "Stock search" };

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = typeof params?.q === "string" ? params.q.slice(0, 80) : "";
  const exchange = typeof params?.exchange === "string" ? params.exchange.toUpperCase() : "ALL";

  return (
    <>
      <PageHeader title="Stock search" subtitle="Find the company, then confirm the exact listing before analysing." />
      <Panel className="mb-4">
        <StockSearchBox key={`${q}|${exchange}`} initialQuery={q} initialExchange={exchange} autoFocus={!q} />
      </Panel>
      {q && <SearchResults q={q} exchange={exchange} />}
    </>
  );
}
