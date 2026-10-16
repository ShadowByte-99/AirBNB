module.exports=(fn)=>{
    return (req,res,next) => {
       (req,res,next).catch(next);
    }
}