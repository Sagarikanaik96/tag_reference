frappe.ui.form.on("Job Site", {
    validate:function(frm){
        if (frm.doc.zip && frm.doc.zip.toString().length != 5){
            frappe.msgprint(__("Minimum and Maximum Characters allowed for Zip are 5"));
            frappe.validated = false;
        }
    }








});