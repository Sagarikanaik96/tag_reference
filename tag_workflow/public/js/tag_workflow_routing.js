$(document).on("startup", function () {
	let url=window.location.href
	let url_splits = url.split("home", 2);
	if(url_splits.length==2){
		if(url_splits[1]!='/' && url_splits[1]!=''){
			frappe.throw('Page '+decodeURI(url_splits[1])+' not found')
		}
	}
	
});
