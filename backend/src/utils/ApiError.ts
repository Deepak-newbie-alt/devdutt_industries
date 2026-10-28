class ApiError extends Error{
    statusCode:number;
    errors:Object[];
    success:boolean;
    constructor(
        statusCode:number,
        message:string="Something went wrong",
        errors:Object[]=[]
    ){
        super(message);
        this.statusCode=statusCode;
        this.errors=errors;
        this.success=false;

        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

export default ApiError;