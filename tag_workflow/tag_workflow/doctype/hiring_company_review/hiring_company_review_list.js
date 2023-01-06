frappe.listview_settings["Hiring Company Review"] = {
    onload:(listview)=>{
        hiring_review();
        $('[data-original-title="Hiring Company"]>div>div>input').val('');
        $('.list-row-col.ellipsis.hidden-xs.text-right').removeClass('text-right');
        let rating_filter = {
            condition: "=",
            default: null,
            fieldname: "ratings_hiring",
            fieldtype: "Data",
            input_class: "input-xs",
            label: "Ratings",
            is_filter: 1,
            onchange: function () {
                listview.refresh();
            },
            placeholder: "Ratings",
        };
        let standard_filters_wrapper = listview.page.page_form.find(".standard-filter-section");
        listview.page.add_field(rating_filter, standard_filters_wrapper);
    },
    formatters:{
        ratings_hiring(val,d,f){
            return `<div class="list-row-col ellipsis hidden-xs ">
				<span class="ellipsis" title="${f.name}: ${val}">
				<a class="filterable ellipsis">
					<span class="rating pr-2"><svg class="icon icon-sm star-click" data-rating="1"><use href="#icon-star"></use></svg>(${val})</span>
				</a>
			</span>
			</div>`
        }
    }
}