frappe.ui.form.on("Job Site", {
	refresh: function(frm){
		if(frm.doc.__islocal){
			console.log(frm.doc.__islocal);
		}
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
	},
	validate:function(frm){
		if (frm.doc.zip && frm.doc.zip.toString().length != 5){
			frappe.msgprint(__("Minimum and Maximum Characters allowed for Zip are 5"));
			frappe.validated = false;
		}
	}
});
