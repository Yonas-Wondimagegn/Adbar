import 'package:hive/hive.dart';

const String cartBoxName = 'cart';
const String userBoxName = 'user';
const String settingsBoxName = 'settings';
const String offlineQueueBoxName = 'offline_queue';
const String productsBoxName = 'products';

Future<void> openBoxes() async {
  await Hive.openBox(cartBoxName);
  await Hive.openBox(userBoxName);
  await Hive.openBox(settingsBoxName);
  await Hive.openBox(offlineQueueBoxName);
  await Hive.openBox(productsBoxName);
}

class LocalDatabase {
  static Box get cart => Hive.box(cartBoxName);
  static Box get user => Hive.box(userBoxName);
  static Box get settings => Hive.box(settingsBoxName);
  static Box get offlineQueue => Hive.box(offlineQueueBoxName);
  static Box get products => Hive.box(productsBoxName);

  static Future<void> clearAll() async {
    await cart.clear();
    await user.clear();
    await offlineQueue.clear();
    await products.clear();
  }

  static Future<void> saveCart(List<Map<String, dynamic>> items) async {
    await cart.put('items', items);
  }

  static List<Map<String, dynamic>> getCart() {
    return List<Map<String, dynamic>>.from(cart.get('items', defaultValue: []));
  }

  static Future<void> saveUser(Map<String, dynamic> data) async {
    await user.put('current', data);
  }

  static Map<String, dynamic>? getUser() {
    final data = user.get('current');
    return data != null ? Map<String, dynamic>.from(data) : null;
  }
}
