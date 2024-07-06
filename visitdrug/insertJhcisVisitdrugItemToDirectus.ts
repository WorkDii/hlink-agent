import pMap from "p-map";
import { directusClient } from "../lib/directus.ts";
import { createItem, deleteItems, readItems } from "@directus/sdk";
import { info } from "../lib/log.ts";
import { VisitDrug } from "./VisitDrug.ts";

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
        `inserted: ${JSON.stringify(inserted)} index: ${i + 1}/${data.length}`
      );
      return inserted;
    },
    { concurrency: 1, stopOnError: false }
  );
}
