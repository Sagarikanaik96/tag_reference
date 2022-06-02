frappe.ui.form.on("Data Import", {
    before_save: function(frm){
        if(frm.doc.__islocal==1){
            cur_frm.set_value('user_company',frappe.boot.tag.tag_user_info.company)
        }
    },
    refresh: function(frm){
        uploaded_file_format(frm);
    },
}
)
function uploaded_file_format(frm){
    frm.get_field('import_file').df.options = {
        restrictions: {
        allowed_file_types: ['.csv','.xlsx','.xls']
        }
    };
}