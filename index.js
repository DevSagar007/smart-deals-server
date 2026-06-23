const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://smartDBUser:hxqLULda7RiwhdgM@cluster0.uhofepr.mongodb.net/?appName=Cluster0";

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

    // bids related api
    app.get("/bids", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
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
