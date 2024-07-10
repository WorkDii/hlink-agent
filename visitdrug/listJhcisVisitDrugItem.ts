import { con } from "../lib/mysql-client.ts";
import { env } from "../lib/env.ts";
import { VisitDrug } from "./VisitDrug.ts";

export async function listJhcisVisitDrugItem(
  startDate?: string,
  endDate?: string
) {
  const [data] = (await con.query(
    `select
      visitno, v.drugcode, costprice, realprice, dateupdate, pcucode, unit, c.drugcode24, c.drugtype
    from visitdrug v
      left join cdrug c on c.drugcode = v.drugcode
    where dateupdate >= ? ${startDate ? "and dateupdate >= ?" : ""} ${
      endDate ? "and dateupdate < ?" : ""
    }
    ORDER by  dateupdate asc`,
    [env.DRUG_SYNC_START_DATE, startDate, endDate]
  )) as Array<VisitDrug>[];
  return data;
}
