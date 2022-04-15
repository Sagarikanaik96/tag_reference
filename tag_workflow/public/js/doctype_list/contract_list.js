frappe.listview_settings["Contract"] = {
    onload:function(listview){
        $('.btn-primary').hide()
        if(frappe.session.user != 'Administrator'){
            $('.custom-actions.hidden-xs.hidden-md').hide()
            $('[data-original-title="Refresh"]').hide()
            $('.menu-btn-group').hide()
        }
        const df = {
            condition: "=",
            default: null,
            fieldname: "docstatus",
            fieldtype: "Select",
            input_class: "input-xs",
            label: "Status",
            is_filter: 1,
            onchange: function() {
                cur_list.refresh();
            },
            options: [0,1,2],
            placeholder: "Status"
        };
        listview.page.add_field(df, '.standard-filter-section');
        let doc_filter = document.querySelector('select[data-fieldname = "docstatus"]')
        doc_filter.options.add(new Option(), 0);
        doc_filter.options[1].innerHTML = 'Draft';
        doc_filter.options[2].innerHTML = 'Submitted';
        doc_filter.options[3].innerHTML = 'Cancelled';
        doc_filter.options.add(new Option('Signed', 3), 4);
        $('[data-original-title = "Status"][data-fieldname = "document_status"]').hide();
    },
    refresh:function(){
        $('.btn-primary').hide()
        $('[data-original-title = "Name"]>input').attr('placeholder', 'Contract ID');
        $('[data-original-title = "Hiring Company"]>input').attr('placeholder', 'Company Name');
        $('span.level-item:nth-child(3)').html('Contract ID');
        $('.list-header-subject > div:nth-child(4) > span:nth-child(1)').html('Company Name');
    }
}
