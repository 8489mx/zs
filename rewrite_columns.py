import re

filepath = r"C:\zn\frontend\src\features\purchases\pages\NewPurchaseOrderPage.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace thead
old_thead = """              <thead>
                <tr>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-product">{t("item_label")}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-warehouse">المخزن</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-qty">{t('quantity')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-price">{t('price_title')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-category">القسم</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-amount">{t('total_amount')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-actions"></th>
                </tr>
              </thead>"""

new_thead = """              <thead>
                <tr>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-product" style={{ width: '35%' }}>{t("item_label")}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-category" style={{ width: '15%' }}>القسم</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-warehouse" style={{ width: '15%' }}>المخزن</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-qty" style={{ width: '10%' }}>{t('quantity')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-price" style={{ width: '10%' }}>{t('price_title')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-amount" style={{ width: '10%' }}>{t('total_amount')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-actions" style={{ width: '5%' }}></th>
                </tr>
              </thead>"""

content = content.replace(old_thead, new_thead)

# Replace tbody row columns
# We need to extract each td chunk and reorder them.
# The row structure is:
# <tr ...>
#   <td class product>...</td>
#   <td class warehouse>...</td>
#   <td class qty>...</td>
#   <td class price>...</td>
#   <td class category>...</td>
#   <td class amount>...</td>
#   <td class actions>...</td>
# </tr>

# We can find the td chunks using regex
row_start_rx = re.compile(r'(<tr[^>]*>\s*)')
product_rx = re.compile(r'(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-product">.*?</td>\s*)', re.DOTALL)
warehouse_rx = re.compile(r'(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-warehouse">.*?</td>\s*)', re.DOTALL)
qty_rx = re.compile(r'(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-qty">.*?</td>\s*)', re.DOTALL)
price_rx = re.compile(r'(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-price">.*?</td>\s*)', re.DOTALL)
category_rx = re.compile(r'(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-category">.*?</td>\s*)', re.DOTALL)
amount_rx = re.compile(r'(<td className="line-total">.*?</td>\s*)', re.DOTALL)
actions_rx = re.compile(r'(<td className="purchase-prototype-table-cell purchase-prototype-table-cell-actions">.*?</td>\s*</tr>)', re.DOTALL)

# Let's locate the tbody
tbody_start = content.find("<tbody>")
tbody_end = content.find("</tbody>", tbody_start)
tbody_content = content[tbody_start:tbody_end]

# For each row, reorder the tds
# Since there is only one map loop generating rows, we can just find the pattern inside the map block.
# Actually, the entire tbody content can just have its td tags extracted and reassembled in order.

# Find all blocks in the exact order they currently appear: product -> warehouse -> qty -> price -> category -> amount -> actions
# Wait, they might have nested tags. Regex might be tricky if there are nested <td> which there aren't here.
# But `.*?` with re.DOTALL is greedy and might overshoot if not careful.
# Better to do simple string splits or use specific markers.
# Since we know the exact starting strings for each `<td>`:

marker_product = '<td className="purchase-prototype-table-cell purchase-prototype-table-cell-product">'
marker_warehouse = '<td className="purchase-prototype-table-cell purchase-prototype-table-cell-warehouse">'
marker_qty = '<td className="purchase-prototype-table-cell purchase-prototype-table-cell-qty">'
marker_price = '<td className="purchase-prototype-table-cell purchase-prototype-table-cell-price">'
marker_category = '<td className="purchase-prototype-table-cell purchase-prototype-table-cell-category">'
marker_amount = '<td className="line-total">'
marker_actions = '<td className="purchase-prototype-table-cell purchase-prototype-table-cell-actions">'

# Let's extract each cell block
part_before_product = tbody_content[:tbody_content.find(marker_product)]
product_end = tbody_content.find(marker_warehouse)
product_block = tbody_content[tbody_content.find(marker_product):product_end]

warehouse_end = tbody_content.find(marker_qty)
warehouse_block = tbody_content[product_end:warehouse_end]

qty_end = tbody_content.find(marker_price)
qty_block = tbody_content[warehouse_end:qty_end]

price_end = tbody_content.find(marker_category)
price_block = tbody_content[qty_end:price_end]

category_end = tbody_content.find(marker_amount)
category_block = tbody_content[price_end:category_end]

amount_end = tbody_content.find(marker_actions)
amount_block = tbody_content[category_end:amount_end]

actions_block = tbody_content[amount_end:] # goes until the end of tbody_content (which is </tbody>)

new_tbody_content = (
    part_before_product +
    product_block +
    category_block +
    warehouse_block +
    qty_block +
    price_block +
    amount_block +
    actions_block
)

content = content[:tbody_start] + new_tbody_content + content[tbody_end:]

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Rewrite Successful")
