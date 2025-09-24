

import imagekit from "../configs/imageKit.js";
import Blog from "../models/Blog.js";
import Comment from "../models/Comment.js";
import main from "../configs/gemini.js";

export const addBlog = async (req, res) => {
  try {
    // Log incoming request data for debugging
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    // Check if req.body.blog exists
    if (!req.body.blog) {
      return res.status(400).json({ success: false, message: "Blog data is missing in form-data" });
    }

    // Parse blog details from form-data
    let blogData;
    try {
      blogData = JSON.parse(req.body.blog);
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid JSON in blog field" });
    }

    const { title, subTitle, description, category, isPublished } = blogData;

    // File uploaded by multer
    const imageFile = req.file;

    // Validate required fields
    if (!title || !description || !category || !imageFile) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: " + 
          (!title ? "title, " : "") +
          (!description ? "description, " : "") +
          (!category ? "category, " : "") +
          (!imageFile ? "image" : ""),
      });
    }

    // Upload image to ImageKit
    const response = await imagekit.upload({
      file: imageFile.buffer.toString("base64"),
      fileName: imageFile.originalname,
      folder: "/blogs",
    });

    // Optimize with ImageKit transformations
    const optimizedImageUrl = imagekit.url({
      path: response.filePath,
      transformation: [
        { quality: "auto" },
        { format: "webp" },
        { width: "1280" },
      ],
    });

    // Save blog to database
    await Blog.create({
      title,
      subTitle,
      description,
      category,
      image: optimizedImageUrl,
      isPublished,
    });

    res.status(201).json({ success: true, message: "Blog added successfully" });
  } catch (error) {
    console.error("Error in addBlog:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBlogs = async (req, res)=>{
    try{
        const blogs = await Blog.find({isPublished: true})
        res.json({success:true, blogs})
    }  catch (error) {
        res.json({success: false, message:error.message})
    }
}

export const getBlogById = async (req, res) =>{
    try{
        const {blogId} = req.params;
        const blog = await Blog.findById(blogId)
        if(!blog){
            res.json({success: true, message: "Blog not found"})
        }
        res.json({success: true, blog})
    } catch (error){
        res.json({success: false, message:error.message})
    }
}

export const deleteBlogById = async (req, res) =>{
    try{
        const {id} = req.body;
         await Blog.findByIdAndDelete(id);

   // Delete all comments associated with the blog
   await Comment.deleteMany({blog: id});
       
        res.json({success: true, message: 'Blog deleted succesfully'})
    } catch (error){
        res.json({success: false, message:error.message})
    }
}

export const togglePublish = async (req, res) =>{
    try{
        const {id} = req.body;
        const blog = await Blog.findById(id)
        blog.isPublished = !blog.isPublished;
        await blog.save();
       
        res.json({success: true, message: 'Blog status updated'})
    } catch (error){
        res.json({success: false, message:error.message})
    }
}


export const addComment = async (req, res) =>{
    try{
       const {blog, name, content} = req.body;
       await Comment.create({blog, name, content});

        res.json({success: true, message: 'Comment added for review'})
    } catch (error){
        res.json({success: false, message:error.message})
    }
}


export const getBlogComments = async (req, res)=>{
  try{
    const {blogId} = req.body;
    const comments = await Comment.find({blog: blogId, isApproved: true}).sort
    ({createdAt: -1});
    
    res.json({success: true, comments})
 } catch (error){
        res.json({success: false, message:error.message})
    }
}
  

export const generateContent = async (req, res)=>{
   try{
    const {prompt} = req.body;
    const content = await main(prompt + 'Generate a blog content for this topic in simple text format')
    res.json({success: true, content})

   } catch (error){
     res.json({success:false, message:error.message})
   }
}

// Like Blog
export const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    blog.dislikes = blog.dislikes.filter(uid => uid.toString() !== userId);

    let userReaction = "like";
    if (blog.likes.includes(userId)) {
      blog.likes = blog.likes.filter(uid => uid.toString() !== userId);
      userReaction = null; // toggled off
    } else {
      blog.likes.push(userId);
    }

    await blog.save();
    res.json({ success: true, likes: blog.likes.length, dislikes: blog.dislikes.length, userReaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dislike Blog
export const dislikeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    blog.likes = blog.likes.filter(uid => uid.toString() !== userId);

    let userReaction = "dislike";
    if (blog.dislikes.includes(userId)) {
      blog.dislikes = blog.dislikes.filter(uid => uid.toString() !== userId);
      userReaction = null;
    } else {
      blog.dislikes.push(userId);
    }

    await blog.save();
    res.json({ success: true, likes: blog.likes.length, dislikes: blog.dislikes.length, userReaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
