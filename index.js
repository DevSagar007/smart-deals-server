const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// firebase initialize
const { initializeApp, cert } = require("firebase-admin/app");

const serviceAccount = require("./smafirebase-adminsdk.json");

initializeApp({
  credential: cert(serviceAccount),
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log("logging info");
  next();
};
const { getAuth } = require("firebase-admin/auth");

const verifyFBToken = async (req, res, next) => {
  console.log("in the verify middleware", req.headers.authorization);
  if (!req.headers.authorization) {
    // do not allow to go
    return res.status(401).send({ message: "unauthorize access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorize access" });
  }
  // verify id token
  try {
    const userInfo = await getAuth().verifyIdToken(token);
    req.token_email = userInfo.email;
    console.log("after token validation", userInfo);

    req.user = userInfo;

    next();
  } catch (err) {
    console.log(err);
    console.log("invalid token");
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uhofepr.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("smart_db");
    const productsCollection = db.collection("products");
    const bidsCollection = db.collection("bids");
    const userCollection = db.collection("users");

    // user post
    app.post("/users", async (red, res) => {
      const newUser = red.body;

      // check existing user
      const email = red.body.email;
      const query = { email: email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        res.send({
          message:
            "User already exists. No need to insert again, otherwise things might get messy 😄",
        });
      } else {
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // get products
    app.get("/products", async (req, res) => {
      console.log(req.query);
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const cursor = productsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get latest product
    app.get("/latest-products", async (req, res) => {
      const cursor = productsCollection.find().sort({ create_at: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get products
    // app.get("/products", async (req, res) => {
    //   const projectFields = { title: 1, price_min: 1, price_max: 1, image: 1 };
    //   const cursor = productsCollection
    //     .find()
    //     .sort({ price_min: 1 })
    //     .skip(2)
    //     .limit(5)
    //     .project(projectFields);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    // get products with id
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // add product
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    // patch update data
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updateProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updateProduct.name,
          price: updateProduct.price,
        },
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    // delete product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // get product bids
    app.get("/products/bids/:productId", verifyFBToken, async (req, res) => {
      const productId = req.params.productId;
      const query = {
        product: productId,
      };
      const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // bids for buyer
    app.get("/bids", logger, verifyFBToken, async (req, res) => {
      // console.log("headers", req.headers);
      console.log("headers", req);
      const email = req.query.email;
      const query = {};
      if (email) {
        if (email !== req.token_email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        query.buyer_email = email;
      }

      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // post bids
    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

// get request
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
