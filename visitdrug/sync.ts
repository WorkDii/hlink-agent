import { format, addSeconds } from "date-fns";
import { RowDataPacket } from "mysql2";
import pMap from "p-map";
import { con } from "../lib/mysql-client.ts";
import { env } from "../lib/env.ts";
import { directusClient } from "../lib/directus.ts";
import { createItem, deleteItems, readItems } from "@directus/sdk";
import { info } from "../lib/log.ts";

const DEFAULT_SCHEDULE = "30 * * * *";

type VisitDrug = RowDataPacket & {
  visitno: number;
  drugcode: string;
  costprice: string;
  realprice: string;
  dateupdate: Date;
  pcucode: string;
  unit: number;
  drugcode24?: string;
  drugtype: string;
};

export async function listJhcisVisitDrugItem(
  startDate?: string,
  endDate?: string
) {
  const [data] = await con.query(
    `select
      visitno, v.drugcode, costprice, realprice, dateupdate, pcucode, unit, c.drugcode24, c.drugtype
    from visitdrug v
      left join cdrug c on c.drugcode = v.drugcode
    where dateupdate >= ? ${startDate ? "and dateupdate >= ?" : ""} ${
      endDate ? "and dateupdate < ?" : ""
    }
    ORDER by  dateupdate asc`,
    [env.DRUG_SYNC_START_DATE, startDate, endDate]
  );
  return data;
}
export async function insertJhcisVisitdrugItemToDirectus(data: VisitDrug[]) {
  await pMap(
    data,
    async (d, i) => {
      // check if drugcode24 is exist fine hospital_drug id
      if (d.drugcode24) {
        const hospitalDrug = await directusClient.request<{ id: string }[]>(
          readItems("hospital_drug", {
            filter: { drugcode24: { _eq: d.drugcode24 } },
            fields: ["id"],
          })
        );
        d.hospital_drug = hospitalDrug.length ? hospitalDrug[0].id : null;
      }
      await directusClient.request(
        deleteItems("visitdrug", {
          filter: {
            _and: [
              { visitno: { _eq: d.visitno } },
              { drugcode: { _eq: d.drugcode } },
              { pcucode: { _eq: d.pcucode } },
            ],
          },
        })
      );
      const inserted = await directusClient.request(createItem("visitdrug", d));
      info(
        "inserted",
        JSON.stringify(inserted),
        `index: ${i + 1}/${data.length}`
      );
      return inserted;
    },
    { concurrency: 1, stopOnError: false }
  );
}
async function jhcis2hlink() {
  try {
    const getLastHlinkData = await directusClient.request<
      { dateupdate: string }[]
    >(
      readItems("visitdrug", {
        sort: ["-dateupdate"],
        limit: 1,
        fields: ["dateupdate"],
      })
    );
    if (getLastHlinkData.length) {
      const lastDateUpdate = getLastHlinkData[0].dateupdate;
      const visitdrug = await listJhcisVisitDrugItem(
        format(addSeconds(lastDateUpdate, 1), "yyyy-MM-dd HH:mm:ss")
      );
      await insertJhcisVisitdrugItemToDirectus(visitdrug);
      info("finish");
    } else {
      const visitdrug = await listJhcisVisitDrugItem();
      await insertJhcisVisitdrugItemToDirectus(visitdrug);
      info("finish");
    }
  } catch (error) {
    info(error);
  }
}

export function triggerDataSync() {
  info("start sync visitdrug", new Date());
  const schedule = env.DRUG_SYNC_SCHEDULE || DEFAULT_SCHEDULE;
  info("initial sync on start");
  jhcis2hlink();
  Deno.cron("sync data cronjob", schedule, async () => {
    info(`running a task every ${schedule} NOW IS `, new Date());
    try {
      await jhcis2hlink();
      info("finish");
    } catch (error) {
      info("error sync visitdrug", error);
    }
  });
}
