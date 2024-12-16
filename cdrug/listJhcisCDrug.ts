import { con } from "../lib/mysql-client.ts";
import { CDrug } from "./type.ts";

export async function listJhcisCDrug(drugcode24s: string[]) {
  const [data] = (await con.query(
    `
    select
      cd.drugcode,
      drugname,
      unitsell,
      unitusage,
      drugtype,
      drugcode24,
      tmtcode,
      lotunit,
      packunit
    from
      cdrug as cd
    left join (
      select
        MAX(takenno),
        drugcode,
        lotunit,
        packunit
      from
        drugrepositorytakendetail d
      group by
        drugcode
        ) as dt on
      dt.drugcode = cd.drugcode
    where
      cd.drugcode24 in (${drugcode24s.join(',')})`
  )) as unknown as Array<CDrug>[];
  return data;
}
