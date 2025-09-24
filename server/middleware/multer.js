import multer from "multer"

//const upload = multer({storage: multer.diskStorage({})})


const storage = multer.memoryStorage();

const upload = multer({storage});

export default upload;