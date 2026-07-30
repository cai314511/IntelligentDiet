document.addEventListener('DOMContentLoaded', function() {
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkout');
    let cart = [];
    let total = 0;

    // 添加菜品到购物车
    document.querySelectorAll('.add-btn').forEach(button => {
        button.addEventListener('click', function() {
            const item = this.parentElement;
            const name = item.dataset.name;
            const price = parseFloat(item.dataset.price);

            // 检查是否已在购物车
            const existingItem = cart.find(cartItem => cartItem.name === name);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ name, price, quantity: 1 });
            }

            updateCart();
        });
    });

    // 更新购物车显示
    function updateCart() {
        cartItems.innerHTML = '';
        total = 0;
        cart.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.name} x${item.quantity} - ¥${(item.price * item.quantity).toFixed(2)}`;
            cartItems.appendChild(li);
            total += item.price * item.quantity;
        });
        totalElement.textContent = `总价: ¥${total.toFixed(2)}`;
    }

    // 结账
    checkoutBtn.addEventListener('click', function() {
        if (cart.length === 0) {
            alert('购物车为空，请先添加菜品！');
        } else {
            alert(`结账成功！总价: ¥${total.toFixed(2)}`);
            cart = [];
            updateCart();
        }
    });
});