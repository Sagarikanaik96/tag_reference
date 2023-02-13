frappe.flags.staff_home = null;
frappe.pages['staff_company_list'].on_page_load = function (wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Staffing Companies',
		single_column: true
	});
	wrapper.face_recognition = new frappe.FaceRecognition(wrapper, page);

}
frappe.FaceRecognition = Class.extend({
	init: function (wrapper, page) {
		let me = this;
		this.parent = wrapper;
		this.page = this.parent.page;
		setTimeout(function () {
			me.setup(wrapper, page);
		}, 0);
		$('h3[title = "Staff Company List"]').html("Staffing Companies");
		frappe.flags.staff_home = me
	},
	setup: function (wrapper, page) {
		let me = this;
		this.start = 0
		this.end = 20
		this.filters = {'radius':25}
		// this.filters = {'radius':localStorage.getItem("city")||localStorage.getItem("company_name")||localStorage.getItem("industry")?"":25}
		this.options = []
		this.data = null;
		this.accreditation = [];
		this.staff_comps = '';
		this.page_value = [20,100,500];
		this.body = $('<div></div>').appendTo(this.page.main);
		$(frappe.render_template('staff_company_list', "")).appendTo(this.body);
		me.show_profile(wrapper, page);
		this.$paging_area =$(`
			<div class="level-left">
				<div class="btn-group">
					<button type="button" class="btn btn-default btn-sm btn-paging btn-info active" data-value="20">20
					</button>
					<button type="button" class="btn btn-default btn-sm btn-paging" data-value="100">100
					</button>
					<button type="button" class="btn btn-default btn-sm btn-paging" data-value="500">500
					</button>
				</div>
			</div>`)
		$('.paging-area').append(this.$paging_area)
		this.$paging_area.on("click", ".btn-paging", (e) => {
			const $this = $(e.currentTarget);
			this.end = $this.data().value;
			this.update_paging_value();
			$this.addClass('active')
			this.refresh()
		})
		if (frappe.boot.tag.tag_user_info.company_type == 'Hiring'|| frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring") {
			document.getElementById('dropdownMenuLink').innerText = 25;
			me.get_industries()
			me.add_fields()

		}



	},
	show_profile: function (_wrapper, _page) {
		frappe.call({
			method: "tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.comp",
			args: {
				company_name: frappe.boot.tag.tag_user_info.company,
				filters: this.filters,
				start:this.start,
				end:this.end
			},
			freeze: true,
			freeze_message:  __("<b>Loading") + "...</b>",
			callback: async function (r) {
				let data = r.message;
				
				data.sort((a, b) => a.name.localeCompare(b.name))
				let sorted_data = [];
				let non_fav = [];
				let profile_html = ``;
				let favourite_companies = await sorted_favourite_company()
				for (let p in data) {
					
					let check = favourite_companies.message.includes(data[p].name);
					if (check) {
						data[p]['LikeStatus'] = true;
						sorted_data.push(data[p]);

					} else {
						data[p]['LikeStatus'] = false;
						non_fav.push(data[p])
					}
				}
				sorted_data.push(...non_fav)
				for (let p in sorted_data) {
					profile_html = await sorted_favourite_companies(sorted_data[p], profile_html, frappe.boot.tag.tag_user_info.company_type);
				}
				$("#myTable").html(profile_html);
				populate_filter();
			}
		})
	},
	add_fields: function () {
		const field = [
			{
				'parent': '#company', 'name': 'company', 'type': 'Autocomplete', 'class': 'input-xs', 'placeholder': 'Company Name','options':this.staff_comps,'filter':1, 'handler': () => {
					this.filters['company'] = document.getElementById('companys').value;
					this.update_list()
					this.refresh()
				}
			},
			{
				'parent': '#industry', 'name': 'industry', 'type': 'MultiSelect', 'class': 'input-xs', 'placeholder': 'Industry', 'options': this.options, 'handler': () => {
					this.filters['industry'] = document.getElementById('industrys').value;
					this.update_list()
					this.refresh()
				}
			},
			{
				'parent': '#city', 'name': 'city', 'type': 'Data', 'class': 'input-xs ', 'placeholder': 'City', 'handler': () => {
					this.filters['city'] = document.getElementById('citys').value;
					this.update_list()
					this.refresh()
				}
			},
			{
				'parent': '#rating', 'name': 'rating', 'type': 'Data', 'class': 'input-xs ', 'placeholder': 'Avg Rating', 'handler': () => {
					this.filters['rating'] = document.getElementById('ratings').value;
					this.update_list()
					this.refresh()
				}
			},
			{
				'parent': '#accreditation', 'name': 'accreditation', 'type': 'MultiSelect','class': 'input-xs ', 'placeholder': 'Accreditations', 
				'options':this.accreditation, 'handler': () => {
					this.filters['accreditation'] = document.getElementById('accreditations').value;
					this.update_list()
					this.refresh()
				}
			},


		]
		for (let f in field) {
			let control = frappe.ui.form.make_control({
				parent: field[f]['parent'],
				df: {
					label: '',
					fieldname: field[f]['name'],
					fieldtype: field[f]['type'],
					input_class: field[f]['class'],
					placeholder: field[f]['placeholder'],
					options: field[f]['options'] ? field[f]['options'] : '',
					onchange: field[f]['handler']
				},
				render_input: true,
			})
			control.$wrapper.find(".input-with-feedback").attr("id", field[f]['name'] + "s")
		}
		document.getElementById('ratings').setAttribute('type', 'number')
		document.getElementById('companys').addEventListener('keyup',(e)=>{
			if(!e.target.value){
				this.filters['company'] = null;
				this.refresh()
			}
				
		})

		setTimeout(()=>{
			
			if (localStorage.getItem("city")) {
				this.filters['city']=localStorage.getItem("city")
		        document.getElementById('citys').value=localStorage.getItem("city")
		        this.refresh()
			}
			else if(localStorage.getItem("company_name")){
				this.filters['company']=localStorage.getItem("company_name")
		        document.getElementById('companys').value=localStorage.getItem("company_name")
		        this.refresh()
			}
			else{

				this.filters['industry']=localStorage.getItem("industry")
				if(localStorage.getItem("industry")){
					document.getElementById('industrys').value=localStorage.getItem("industry")
					let a = document.getElementById('industrys');
					a.dispatchEvent(new Event("input")); 
					document.querySelector('#awesomplete_list_2 > li').click();
					a.dispatchEvent(new Event("submit"));
				}
		        this.refresh()
			}
			
	   }, 200);
	},
	refresh: function () {
		this.show_profile();
		this.update_list()
	},
	get_industries: function () {
		if (frappe.boot.tag.tag_user_info.company_type == "Hiring" ||frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring" ) {
			frappe.call({
				method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.get_industries',
				args: { user: frappe.session.user },
				async: 0,
				callback: (r) => {
					if (r.message) {
						for (let i in r.message[0])
							this.options.push(r.message[0][i]);
						for (let j in r.message[1])
							this.accreditation.push(r.message[1][j])
						this.staff_comps += r.message[2]
					}
				}
			})
		}
	},
	update_list: function(){
		this.start = 0
		this.end = 20
		this.update_paging_value();
		this.$paging_area.find(`.btn-paging[data-value="${this.end}"]`).addClass('active')

	},
	update_paging_value: function(){
		for (let p in this.page_value)
			this.$paging_area.find(`.btn-paging[data-value="${this.page_value[p]}"]`).removeClass('active')
	
	}

})


async function sorted_favourite_companies(data, profile_html, company_type) {
	let title = data.title
	let count = data.count>1?'<span class="pl-1">&#x2B;</span>' + parseInt(data.count-1):"";
	let block_count = data.blocked_count>1?'<span class="pl-1">&#x2B;</span>' + parseInt(data.blocked_count-1):"";
	let link = data.name.split(' ').join('%');
	let Likebtnexclusice = `<td></td>`
	let Likebtnnonexclusice = `<td>
		<svg ${data.LikeStatus ? "class='icon icon-sm liked'" : "class='icon icon-sm not-liked'"}cursor:pointer" onClick = setLike(this,"${link}")>
		<use class="like-icon" href="#icon-heart"></use>
		</svg>
		</td>`
	profile_html += `<tr data-name="${data.name}" class="comps">
					${company_type === "Exclusive Hiring" ? Likebtnexclusice : Likebtnnonexclusice}
					<td ><a onclick=dynamic_route("${link}")>${data.name}</a></td>
					${data.industry_type?"<td><span>"+ data.industry_type +" "+ block_count +"</span></td>": '<td></td>'}
					<td>${data.address || data.complete_address || ''}</td>	
					<td ${data.rating ?'<span class="rating pr-2"><svg class="icon icon-sm star-click" data-rating="1"><use href="#icon-star"></use></svg></span>' + data.rating 
					:""}</td>
					 ${data.accreditation ? `<td><span class="staff-certificate-btn px-3 py-1"  id="${data.name} data-toggle="tooltip" data-placement="top" title="${title}">` + data.accreditation + '</span><span class="text-primary">' + count + '</span></td>'
					:"<td></td>"}
					<td>${data.is_blocked ? "<td></td>" : '<td><button class="btn-primary" onclick=trigger_direct_order("' + link + '")>Place Direct Order</button></td>'}</td>
					</tr>`;
	return profile_html;
}

function dynamic_route(name) {
	let name1 = name.replace(/%/g, ' ');
	localStorage.setItem("company", name1);
	window.location.href = "/app/dynamic_page";
}

function setLike(event, company) {
	if (event.classList.contains('not-liked')) {
		event.style.fill = 'red'
		event.style.stroke = 'white'
		event.classList.remove('not-liked')
		event.classList.add('liked')
		favourite_company(company)
	} else {
		event.classList.remove('liked')
		event.classList.add('not-liked')
		event.style.fill = 'white'
		event.style.stroke = 'var(--gray-500)'
		unfavourite_company(company)
	}
}

function trigger_direct_order(staff_name) {
	staff_name = staff_name.split('%').join(' ')
	let doc = frappe.model.get_new_doc("Job Order");
	doc.company = frappe.boot.tag.tag_user_info.company;
	doc.staff_company = staff_name;
	doc.posting_date_time = frappe.datetime.now_date();
	frappe.set_route("Form", doc.doctype, doc.name);
}
function favourite_company(company) {
	let company_name = company.replaceAll("%", " ")
	frappe.call({
		method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.favourite_company',
		"freeze": true,
		"freeze_message": "<p><b>Adding Company to favorites</b></p>",
		args: {
			'company_to_favourite': company_name,
			'user_name': frappe.boot.tag.tag_user_info.company
		},
		callback: function (r) {
			if (r.message == "True") {
				frappe.msgprint(company_name + " has been added to favorites.")
			}
		}
	})
	return "True"
}

async function sorted_favourite_company() {
	let a = '';
	a = frappe.call({
		method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.sorted_favourite_companies',
		"freeze": true,
		"freeze_message": "<p><b>Adding Company to Favorites</b></p>",
		args: {
			'user_name': frappe.boot.tag.tag_user_info.company
		},
	})
	return a
}

function unfavourite_company(company) {
	let company_name = company.replaceAll("%", " ")
	frappe.call({
		method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.unfavourite_company',
		"freeze": true,
		"freeze_message": "<p><b>Removing Company from Favorites</b></p>",
		args: {
			'company_to_favourite': company_name,
			'user_name': frappe.boot.tag.tag_user_info.company
		},
		callback: async function (r) {
			if (r.message == "False") {
				frappe.msgprint(company_name + " has been removed from favorites.")
				return "False"
			}
		}
	})
	return "True"
}


async function get_favourites_list(company) {
	let a = '';
	if (frappe.boot.tag.tag_user_info.company_type == 'Hiring') {
		a = frappe.call({
			method: 'tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.checking_favourites_list',
			args: {
				'company_to_favourite': company,
				'user_name': frappe.boot.tag.tag_user_info.company
			}
		})
	}
	return a
}

frappe.realtime.on('refresh_data', () => {
	if (localStorage.getItem('search')) {
		document.getElementById('companys').value = '';
		populate_filter();
		$('#companys').change()


	}

})


function populate_filter() {
	localStorage.removeItem("city");
	localStorage.removeItem("industry");
	localStorage.removeItem("company_name")
	
	
	if (localStorage.getItem('search')) {
		const val = localStorage.getItem('search');
		document.getElementById('companys').value = val;
		Array.from(document.querySelectorAll('.comps')).filter((el) => {
			if (!el.attributes['data-name'].value.toLowerCase().startsWith(val)) {
				document.querySelector(`#myTable tr[data-name="${el.attributes['data-name'].value}"]`).style.display = 'none'
			}
		})
		localStorage.removeItem('search')
	}
}

function get_radius(val) {
	if (!['', undefined].includes(val)) {
		document.getElementById('dropdownMenuLink').innerText = val
		frappe.flags.staff_home.filters['radius'] = val
		frappe.flags.staff_home.refresh()
	}
	else {
		document.getElementById('dropdownMenuLink').innerText = 'Distance'
		frappe.flags.staff_home.filters['radius'] = ''
		frappe.flags.staff_home.refresh()
	}

}
