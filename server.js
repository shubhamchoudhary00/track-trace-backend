const express = require("express");
const colors = require("colors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const connectDB = require("./config/db");
const cors = require("cors");
const bodyParser = require("body-parser");
const cluster = require("cluster");
const os = require("os");

dotenv.config();
connectDB();

// Check if the current process is the master process
// if (cluster.isMaster) {
//     // Get the number of available CPU cores
//     const numCPUs = os.cpus().length;

//     console.log(`Master ${process.pid} is running`);

//     // Fork workers (one for each CPU core)
//     for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     }

//     // Listen for dying workers and replace them
//     cluster.on("exit", (worker, code, signal) => {
//         console.log(`Worker ${worker.process.pid} died`);
//         console.log("Starting a new worker...");
//         cluster.fork();
//     });
// } else {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(morgan("dev"));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.use("/api/v1/user", require("./routes/userRoutes"));
    app.use("/api/v1/shipping", require("./routes/shippingRoutes"));
    app.use("/api/v1/branch", require("./routes/branchRoutes"));
    app.use("/api/v1/staff", require("./routes/staffRoutes"));
    app.use("/api/v1/party", require("./routes/partyRoutes"));
    app.use("/api/v1/courier", require("./routes/courierPartnerRoutes"));

    const port = process.env.PORT || 5000;

    app.listen(port, () => {
        console.log(
            `Worker ${process.pid} running server in ${process.env.NODE_ENV} mode on port ${port}`.bgCyan.white
        );
    });
// }
