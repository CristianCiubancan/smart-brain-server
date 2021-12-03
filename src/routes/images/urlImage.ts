import express from "express";
import { Req } from "../../types/networkingTypes";
import { grpc } from "clarifai-nodejs-grpc";
import service from "clarifai-nodejs-grpc/proto/clarifai/api/service_pb";
import resources from "clarifai-nodejs-grpc/proto/clarifai/api/resources_pb";
import { V2Client } from "clarifai-nodejs-grpc/proto/clarifai/api/service_grpc_pb";
import { getConnection } from "typeorm";

const handleUrlImage = async (req: Req, res: express.Response) => {
  if (!req.session.userId) {
    return res.json({ error: "not authenticated" });
  }

  const { url } = req.body;

  const clarifai = new V2Client(
    "api.clarifai.com",
    grpc.ChannelCredentials.createSsl()
  );

  const metadata = new grpc.Metadata();
  metadata.set("authorization", `Key ${process.env.CLARIFAI_AUTH as string}`);

  const request = new service.PostModelOutputsRequest();
  request.setModelId("f76196b43bbd45c99b4f3cd8e8b40a8a");
  request.addInputs(
    new resources.Input().setData(
      new resources.Data().setImage(new resources.Image().setUrl(url))
    )
  );

  let facesArray: any[] = [];

  const detectFaces = () =>
    new Promise((resolve, _reject) =>
      clarifai.postModelOutputs(request, metadata, async (_error, response) => {
        for (let r of response
          .getOutputsList()[0]
          .getData()!
          .getRegionsList()) {
          facesArray.push((r.getRegionInfo()?.getBoundingBox() as any).array);
        }

        resolve(response);
      })
    );
  await detectFaces();

  await getConnection().query(
    `update "user" set score = ${facesArray.length} where id = ${req.session.userId} and (score < ${facesArray.length} or score = null)`
  );

  const newRank = await getConnection().query(
    `select r.id, r.username, r.rank from ( select u.id, u.username, ROW_NUMBER () OVER ( ORDER BY score desc ) as rank from "user" u ) as r where r.id = ${req.session.userId}`
  );

  return res.json({ facesArray, newRank: newRank[0] });
};

export default handleUrlImage;
