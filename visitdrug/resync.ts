import { aggregate, deleteItems } from "@directus/sdk";
import { directusClient } from "../lib/directus.ts";
import {
  insertJhcisVisitdrugItemToDirectus,
  listJhcisVisitDrugItem,
} from "./sync.ts";
import { env } from "../lib/env.ts";
import { con } from "../lib/mysql-client.ts";
import { info } from "../lib/log.ts";
import { RowDataPacket } from "mysql2";
import pMap from "p-map";
import { addDays, addYears, format, startOfDay } from "date-fns";

function removeItemHLink(startDate: string, endDate: string) {
  return directusClient.request(
    deleteItems("visitdrug", {
      filter: {
        pcucode: { _eq: env.PCU_CODE },
        dateupdate: {
          _gte: startDate,
          _lt: endDate,
        },
      },
      // fix remove all data filtered
      limit: -1,
    })
  );
}

async function countAll(startDate: string) {
  const [{ count: countHLinkServer }] = await directusClient.request<
    { count: string }[]
  >(
    aggregate("visitdrug", {
      query: {
        filter: {
          pcucode: { _eq: env.PCU_CODE },
          dateupdate: { _gte: startDate },
        },
      },
      aggregate: { count: ["*"] },
    })
  );

  const [data] = (await con.query(
    `select
      count(*) as count
    from visitdrug v
    where dateupdate >= ? and pcucode = ? and dateupdate >=?`,
    [env.DRUG_SYNC_START_DATE, env.PCU_CODE, startDate]
  )) as [(RowDataPacket & { count: Number })[]];
  if (parseInt(countHLinkServer) !== data[0].count) {
    info(`countAll jhcis: ${data[0].count} hlink: ${countHLinkServer}`);
    await countMonth(startDate);
  }
}

async function countMonth(startDate: string) {
  const [jhcisData] = (await con.query(
    `select YEAR(dateupdate) as year, MONTH(dateupdate) as month, count(*) as count
    from visitdrug v
    where dateupdate >= ? and pcucode = ? and dateupdate >=?
    group by YEAR(dateupdate), MONTH(dateupdate)`,
    [env.DRUG_SYNC_START_DATE, env.PCU_CODE, startDate]
  )) as [
    (RowDataPacket & {
      year: number;
      month: number;
      count: number;
    })[]
  ];

  await pMap(
    jhcisData,
    async (jD) => {
      const startDateOfThisMonth = `${jD.year}-${jD.month
        .toString()
        .padStart(2, "0")}-01`;
      const startDateOfNextMonth = `${jD.year}-${(jD.month + 1)
        .toString()
        .padStart(2, "0")}-01`;
      const hlinkData = await directusClient.request<
        {
          count: string;
        }[]
      >(
        aggregate("visitdrug", {
          query: {
            filter: {
              pcucode: { _eq: env.PCU_CODE },
              dateupdate: {
                _gte: startDateOfThisMonth,
                _lt: startDateOfNextMonth,
              },
            },
          },
          aggregate: { count: ["*"] },
        })
      );
      if (parseInt(hlinkData[0].count) !== jD.count) {
        info(
          `countMonth ${startDateOfThisMonth} jhcis: ${jD.count}  hlink: ${hlinkData[0].count}`
        );
        await countDay(startDateOfThisMonth, startDateOfNextMonth, startDate);
      }
    },
    { concurrency: 1 }
  );
}
async function countDay(
  startDateOfThisMonth: string,
  startDateOfNextMonth: string,
  startDate: string
) {
  const [jhcisData] = (await con.query(
    `select DATE(dateupdate) as dateupdate, count(*) as count
    from visitdrug v
    where dateupdate >= ? and pcucode = ? and dateupdate >= ? and dateupdate >= ? and dateupdate < ?
    group by DATE(dateupdate)`,
    [
      env.DRUG_SYNC_START_DATE,
      env.PCU_CODE,
      startDate,
      startDateOfThisMonth,
      startDateOfNextMonth,
    ]
  )) as [
    (RowDataPacket & {
      dateupdate: Date;
      count: Number;
    })[]
  ];
  await pMap(
    jhcisData,
    async (jD) => {
      const thisDate = format(jD.dateupdate, "yyyy-MM-dd");
      if (thisDate === format(new Date(), "yyyy-MM-dd")) {
        // prevent bug when today is not finished
        info("skip today");
        return Promise.resolve();
      }
      const nextDate = format(addDays(jD.dateupdate, 1), "yyyy-MM-dd");

      const hlinkData = await directusClient.request<
        {
          count: string;
        }[]
      >(
        aggregate("visitdrug", {
          query: {
            filter: {
              pcucode: { _eq: env.PCU_CODE },
              dateupdate: {
                _gte: thisDate,
                _lt: nextDate,
              },
            },
          },
          aggregate: { count: ["*"] },
        })
      );
      if (parseInt(hlinkData[0].count) !== jD.count) {
        info(
          `countDay ${thisDate} jhcis: ${jD.count}  hlink: ${hlinkData[0].count}`
        );
        await removeItemHLink(thisDate, nextDate);
        const visitdate = await listJhcisVisitDrugItem(thisDate, nextDate);
        await insertJhcisVisitdrugItemToDirectus(visitdate);
      }
    },
    { concurrency: 1 }
  );
}

export function triggerDataReSync() {
  info("start resync visitdrug", new Date());
  const oneYearAgo = format(startOfDay(addYears(new Date(), -1)), "yyyy-MM-dd");
  countAll(oneYearAgo).then((res) => {
    console.log("done resync visitdrug", new Date().toISOString());
  });
  Deno.cron("resync data cronjob", "30 3 * * *", async () => {
    info(`running a task at ' 30 3 * * *' NOW IS `, new Date());
    try {
      const oneYearAgo = format(
        startOfDay(addYears(new Date(), -1)),
        "yyyy-MM-dd"
      );
      await countAll(oneYearAgo);
      info("done resync visitdrug", new Date().toISOString());
    } catch (error) {
      info("error resync visitdrug", error);
    }
  });
}
