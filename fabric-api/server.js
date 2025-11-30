// server.js — GET-REECH-BLOCKCHAIN Fabric API (robust, safe, production-ready, with image handling)
const express = require("express");
const { Gateway, Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

// ---------------- EXPRESS + CORS SETUP ----------------
const app = express();
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json());

// ---------------- MULTER SETUP ----------------
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB per file, max 5 files
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG and PNG images are allowed"));
    }
    cb(null, true);
  },
});

// ---------------- LOGGER SETUP ----------------
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, "server.log"),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    new winston.transports.Console(),
  ],
});

// ---------------- CONFIG ----------------
const CONFIG = {
  channelName: "mychannel",
  chaincodeName: "bigdatacc",
  mspId: "Org1MSP",
  walletPath: path.join(__dirname, "wallet"),
  identityLabel: "org1admin",
  connectionProfilePath: path.join(
    __dirname,
    "..",
    "backend",
    "fabric-samples",
    "test-network",
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "connection-org1.json"
  ),
};

// ---------------- FABRIC SINGLETONS ----------------
let gateway = null;
let contract = null;

// ---------------- FABRIC HELPER ----------------
async function getContract() {
  if (contract) return contract;

  // Validate connection profile
  if (!fs.existsSync(CONFIG.connectionProfilePath)) {
    const msg = `Connection profile not found: ${CONFIG.connectionProfilePath}`;
    logger.error(msg);
    throw new Error(msg);
  }

  // Create wallet reference
  const walletPath = path.resolve(CONFIG.walletPath);
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  logger.info(`🔍 Using wallet at: ${walletPath}`);

  // Ensure identity exists
  // use wallet.get if available; fallback to list() check
  let identity;
  try {
    identity = await wallet.get(CONFIG.identityLabel);
  } catch (e) {
    identity = null;
  }

  if (!identity) {
    // Try list() alternative and check labels (older/newer SDK differences)
    try {
      const identities = await wallet.list();
      const found = identities && identities.some(i => i.label === CONFIG.identityLabel || i === CONFIG.identityLabel);
      if (!found) {
        const msg = `Identity ${CONFIG.identityLabel} not found in wallet: ${walletPath}`;
        logger.error(msg);
        throw new Error(msg);
      }
    } catch (e) {
      const msg = `Identity ${CONFIG.identityLabel} not found in wallet: ${walletPath}`;
      logger.error(msg);
      throw new Error(msg);
    }
  }

  // Load connection profile
  const connectionProfile = JSON.parse(fs.readFileSync(CONFIG.connectionProfilePath, "utf8"));

  // Create gateway, connect, and get contract
  gateway = new Gateway();
  await gateway.connect(connectionProfile, {
    wallet,
    identity: CONFIG.identityLabel,
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gateway.getNetwork(CONFIG.channelName);
  contract = network.getContract(CONFIG.chaincodeName);
  logger.info("✅ Connected to Fabric network");
  return contract;
}

// ---------------- SHUTDOWN HANDLING ----------------
async function shutdown() {
  try {
    if (gateway) {
      await gateway.disconnect();
      logger.info("🛑 Gateway disconnected gracefully");
    }
    process.exit(0);
  } catch (err) {
    logger.error("Error during shutdown", { message: err.message, stack: err.stack });
    process.exit(1);
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ---------------- HELPERS ----------------
function badRequest(res, message, details = []) {
  return res.status(400).json({ status: "error", message, details });
}

function serverError(res, err) {
  const message = err && err.message ? err.message : "Internal server error";
  logger.error("Server error", { message, stack: err && err.stack });
  return res.status(500).json({ status: "error", message });
}

function normalizeFisher(body = {}) {
  return {
    fisherId: String(body.fisherId || body.fisher_id || "").trim(),
    name: String(body.name || "").trim(),
    govtId: String(body.govtId || body.govt_id || "").trim(),
  };
}

function normalizeCatch(body = {}) {
  return {
    catch_id: body.catch_id || body.catchId || `catch-${uuidv4()}`, // Server-side UUID
    fisher_id: String(body.fisher_id || body.fisherId || "").trim(),
    species: String(body.species || "").trim().toLowerCase(),
    drying_method: String(body.drying_method || body.dryingMethod || "").trim().toLowerCase(),
    batch_size: Number(body.batch_size || body.batchSize || 0),
    weight: Number(body.weight || 0),
    harvest_date: String(body.harvest_date || body.harvestDate || "").trim(),
    shelf_life: Number(body.shelf_life || body.shelfLife || 0),
    price: Number(body.price || 0),
    lat: Number(body.lat || 0),
    lng: Number(body.lng || 0),
  };
}

function normalizeBatch(body = {}) {
  let catchIds = [];
  try {
    if (Array.isArray(body.catchIds)) catchIds = body.catchIds;
    else if (typeof body.catch_ids === "string" && body.catch_ids.length)
      catchIds = JSON.parse(body.catch_ids);
    else if (Array.isArray(body.catch_ids)) catchIds = body.catch_ids;
  } catch {
    catchIds = [];
  }

  return {
    batchId: body.batchId || body.batch_id || `batch-${uuidv4()}`, // Server-side UUID
    catchIds,
    processorId: String(body.processorId || body.processor_id || "").trim(),
    date: String(body.date || "").trim(),
  };
}

function validateCatch(data) {
  const errors = [];
  if (!data.fisher_id) errors.push("fisher_id is required");
  if (!data.species) errors.push("species is required");
  if (data.weight <= 0) errors.push("weight must be positive");
  if (!data.harvest_date) errors.push("harvest_date is required");
  if (!data.drying_method) errors.push("drying_method is required");
  if (data.batch_size <= 0) errors.push("batch_size must be positive");
  if (data.shelf_life <= 0) errors.push("shelf_life must be positive");
  if (data.price <= 0) errors.push("price must be positive");
  if (data.lat < -90 || data.lat > 90) errors.push("lat must be between -90 and 90");
  if (data.lng < -180 || data.lng > 180) errors.push("lng must be between -180 and 180");
  return errors;
}

// ---------------- ROUTES ----------------

// Health Check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

// Register Fisher
app.post("/api/fishers", async (req, res) => {
  try {
    const data = normalizeFisher(req.body);
    if (!data.fisherId || !data.name || !data.govtId)
      return badRequest(res, "Missing required fields", ["fisherId", "name", "govtId"]);

    const contract = await getContract();
    await contract.submitTransaction("RegisterFisher", data.fisherId, data.name, data.govtId);
    logger.info("✅ Fisher registered", { fisherId: data.fisherId });

    res.json({ status: "success", fisherId: data.fisherId });
  } catch (err) {
    const msg = (err && err.message) ? err.message.toLowerCase() : "";
    if (msg.includes("already exists"))
      return res.status(409).json({ status: "exists", message: "Fisher already exists" });
    return serverError(res, err);
  }
});
// ✅ Get Single Catch by Fisher and Catch ID
app.get("/api/catches/:catchId", async (req, res) => {
  try {
    const { catchId } = req.params;
    const fisherId = req.query.fisherId || req.body.fisherId;

    if (!fisherId || !catchId) {
      return badRequest(res, "Missing fisherId or catchId", ["fisherId", "catchId"]);
    }

    const contract = await getContract();
    const result = await contract.evaluateTransaction("GetCatch", fisherId, catchId);

    const data = result && result.length ? JSON.parse(result.toString()) : null;

    if (!data) {
      return res.status(404).json({ status: "error", message: "Catch not found" });
    }

    res.json({ status: "success", data });
  } catch (err) {
    const msg = err?.message?.toLowerCase() || "";
    if (msg.includes("not found") || msg.includes("does not exist")) {
      return res.status(404).json({ status: "error", message: "Catch not found" });
    }
    return serverError(res, err);
  }
});

// ✅ Submit Catch (robust image handling)
app.post(
  "/api/catches",
  (req, res, next) => {
    const uploadHandler = multer({
      dest: uploadsDir,
      limits: { fileSize: 5 * 1024 * 1024, files: 5 },
    }).fields([
      { name: "images", maxCount: 5 },
      { name: "images[]", maxCount: 5 },
    ]);

    uploadHandler(req, res, (err) => {
      if (err) {
        logger.warn("Image upload error", { message: err.message });
        return res.status(400).json({
          status: "error",
          message: "Image upload failed",
          details: err.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const data = normalizeCatch(req.body);
      const validationErrors = validateCatch(data);
      if (validationErrors.length)
        return badRequest(res, "Invalid catch data", validationErrors);

      // ✅ Safely access uploaded files (handles both images and images[])
      const files =
        (req.files &&
          (req.files["images"] ||
            req.files["images[]"] ||
            Object.values(req.files).flat())) ||
        [];

      if (files.length === 0)
        return badRequest(res, "At least one image is required", ["images"]);

      const imageFilenames = files.map((file) => path.basename(file.path));

      const contract = await getContract();
      await contract.submitTransaction(
        "LogCatch",
        data.catch_id,
        data.fisher_id,
        data.species,
        String(data.weight),
        data.harvest_date,
        data.drying_method,
        String(data.batch_size),
        String(data.shelf_life),
        String(data.price),
        String(data.lat),
        String(data.lng),
        JSON.stringify(imageFilenames)
      );

      logger.info("✅ Catch stored successfully", {
        catch_id: data.catch_id,
        fisher_id: data.fisher_id,
        images: imageFilenames.length,
      });

      res.json({
        status: "success",
        catchId: data.catch_id,
        images: imageFilenames,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err?.message?.toLowerCase() || "";
      if (msg.includes("already exists"))
        return res
          .status(409)
          .json({ status: "exists", message: "Catch already exists" });

      if (err.name === "MulterError") {
        logger.warn("Multer error when uploading images", { message: err.message });
        return badRequest(res, "Image upload failed", [err.message]);
      }

      return serverError(res, err);
    }
  }
);


// Get All Catches by Fisher
app.get("/api/catches/:fisherId", async (req, res) => {
  try {
    const { fisherId } = req.params;
    if (!fisherId) return badRequest(res, "Missing path parameter", ["fisherId"]);

    const contract = await getContract();
    const result = await contract.evaluateTransaction("QueryCatchesByFisher", fisherId);
    res.json({ status: "success", data: JSON.parse(result.toString()) });
  } catch (err) {
    return serverError(res, err);
  }
});

// Create Batch
app.post("/api/batches", async (req, res) => {
  try {
    const data = normalizeBatch(req.body);

    if (!Array.isArray(data.catchIds) || !data.catchIds.length)
      return badRequest(res, "catchIds must be a non-empty array", ["catchIds"]);

    if (!data.processorId || !data.date)
      return badRequest(res, "Missing required fields", ["processorId", "date"]);

    const contract = await getContract();

    // ⚠️ Temporary bypass — chaincode lacks CatchExists, skipping check
    for (const catchId of data.catchIds) {
      logger.warn(`[Bypass] Skipping CatchExists validation for catchId=${catchId}`);
    }

    await contract.submitTransaction(
      "CreateBatch",
      data.batchId,
      JSON.stringify(data.catchIds),
      data.processorId,
      data.date
    );

    logger.info("✅ Batch stored successfully", {
      batchId: data.batchId,
      includedCatches: data.catchIds.length,
    });

    res.json({
      status: "success",
      batchId: data.batchId,
      includedCatches: data.catchIds,
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// Track Batch
app.get("/api/batches/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!batchId) return badRequest(res, "Missing path parameter", ["batchId"]);

    const contract = await getContract();
    const result = await contract.evaluateTransaction("TrackBatch", batchId);
    res.json({ status: "success", data: JSON.parse(result.toString()) });
  } catch (err) {
    const msg = (err && err.message) ? err.message.toLowerCase() : "";
    if (msg.includes("not found") || msg.includes("does not exist"))
      return res.status(404).json({ status: "error", message: "Batch not found" });
    return serverError(res, err);
  }
});

// Global 404
app.use((req, res) => res.status(404).json({ status: "error", message: "Not found" }));

// ---------------- SERVER START ----------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));
