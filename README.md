# rx-quest

This is an [RxJs](https://github.com/Reactive-Extensions/RxJS) wrapper for the [hyperquest library](https://github.com/substack/hyperquest). It is intended to track the `hyperquest` API as closely as possible, with the following exceptions:

* If the `hyperquest` method expects a callback, the `rx-quest` method instead returns an Observable
* `Observable` replaces `Stream`

Pull requests welcome!
