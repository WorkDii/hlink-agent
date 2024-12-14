import { con } from "../lib/mysql-client.ts";
import { CDrug } from "./type.ts";

export async function listJhcisCDrug(drugcode24s: string[]) {
  const [data] = (await con.query(
    `select drugcode, drugname, unitsell, unitusage, drugtype, drugcode24, tmtcode from cdrug where drugcode24 in (${drugcode24s.join(',')})`
  )) as unknown as Array<CDrug>[];
  return data;
}
