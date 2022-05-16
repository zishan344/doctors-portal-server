const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.azsu8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const serviceCollection = client
      .db("doctors_service")
      .collection("services");
    await client.connect();
    const bookingCollection = client
      .db("doctors_service")
      .collection("booking ");
    const userCollection = client.db("doctors_service").collection("users");
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send({ success: true, result });
    });
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //warning:
    // This is not the proper way to query
    // After learning more about mongodb. use aggregate lookup, pipeline, match, group
    //available slots
    app.get("/available", async (req, res) => {
      const date = req.query.date;
      // step 1 get all services
      const services = await serviceCollection.find().toArray();
      // step 2 get the booking of the day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();
      // step 3:for each service find booking for that service
      services.forEach((service) => {
        // step 4 find the booking get service
        const serviceBookings = bookings.filter(
          (b) => b.treatment === service.name
        );
        // step 5: select slots for the service Booking
        const bookedSlots = serviceBookings.map((book) => book.slot);
        // service.booked=serviceBookings.map(s=>s.slot)

        // step 6: select those slots that are not in bookSlots
        const available = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        //step 7 set available to slots to make it easier
        service.slots = available;
      });

      res.send(services);
    });
    app.get("/availableAppointments", async (req, res) => {
      const authorization = req.headers.authorization;
      console.log(authorization);
      const user = { patient: req.query.patient };
      // step 1 get all services
      const availableAppointments = await bookingCollection
        .find(user)
        .toArray();
      res.send(availableAppointments);
    });

    // user collection
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctors portal is hear");
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
