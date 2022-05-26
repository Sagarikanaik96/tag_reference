frappe.ui.form.on("Data Import", {
    before_save: function(frm){
        if(frm.doc.__islocal==1){
            cur_frm.set_value('user_company',frappe.boot.tag.tag_user_info.company)
        }
    },
}
)